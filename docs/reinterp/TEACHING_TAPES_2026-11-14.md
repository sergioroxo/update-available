STATUS: live

# The teaching tapes (14 Nov 2026, S387, UiB job 24 Part B)

*Drafts for Sérgio to watch and read before anything is built into the piece. Nothing in `src/`, `data/` or `public/`
changed. Every line of display text is a draft for his eye. Brief: `UIB_JOB_24_2026-11-14.md` Part B. Research:
`RESEARCH_ROOTS_CAUSES_LIA_2026-11-14.md` (the archive read: §2 the causal model as taught, §4 the marketplace, §5 and
§8G the ethics flags, §6 and §8F the segments) and `SOURCES_TO_FETCH_2016_2026_2026-11-14.md` (§7, his 14 Nov downloads,
which serve 2016 and 2026).*

## 0. States

*Added by UiB job 25 (S389). Every version is kept as a research state: nothing listed here is overwritten or deleted
(his 14 Nov words: "Don't delete the earlier versions, they serve as research states").*

| state | date, job | what | folder (git-ignored) | page | doc | his note on it |
|---|---|---|---|---|---|---|
| **v1**, the orientation tape | 13 Nov, job 23 (S385) | "TriedPath Fellowship · Orientation · Tape 1 of 3: Your First Steps", 74 s: the programme's procedure on a felt board | `output/orientation-tape/` | https://claude.ai/artifact/6yjAXiFHXLietqp38MFfuK | `ORIENTATION_TAPE_2026-11-13.md` | the content was good, "minus the abusive use of static and noise", but its message was "very similar to the initiation video from the start" |
| **v2** and **the scripts** | 14 Nov, job 24 (S387) | 1997 "Understanding Your Roots", 3:42.9, a video; 2016 "Heartwood" and 2026 "HEDGE™", scripts and six storyboard frames each | `output/teaching-tapes/1997/`, `2016/storyboard/`, `2026/storyboard/`, `storyboard-src/` | https://claude.ai/artifact/MCXWDErFNWx51FMvzbeSyy | this file, §1–§3 | 1997: "I did like very much the education aspect of the 1997 video … really great job in creating the content based on the documents", but "I do wonder if they need to have some more clear dissonances, and like a contradicting element that helps understand that these theories aren't actually truthful." 2016 and 2026: "they both looked really good, would love to see them". 2003: "it has the new you, so it makes sense to not have a video". The music: "You can make new music, like it wasn't that great" |
| **v3** and **the two videos** | 14 Nov, job 25 (S389) | 1997 v3 (v2 + the record's cards + music made in code), 2016 "Heartwood" and 2026 "HEDGE™" as videos, each with a short tape for the room's TV | `output/teaching-tapes/1997-v3/`, `2016/video/`, `2026/video/` | https://claude.ai/artifact/4auxHygUfkgCHqQEKHdb5K | this file, §4–§8 | — (waits on his eye) |

## The three tapes

One tape for each room, each a teaching tape of its period that explains "why you are like this" the way the
programmes taught it.

| room | year | who | the tape | here |
|---|---|---|---|---|
| 1 | 1997 | Daniel (gay) | TriedPath Fellowship, "Understanding Your Roots": six lessons on the causes, cut by four ministry commercials | §1, a video |
| 2 | 2016 | Vera (lesbian) | "Heartwood", Session Two: The Roots: a women's course video (overhead journaling, hands only), cut by three mid-roll ads | §2, script and storyboard |
| 3 | 2026 | Maya (trans) | "HEDGE™": a parents' course about an adult daughter, in campaign-film grammar, with an AI front door that books the free call | §3, script and storyboard |

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
- **Music:** ⚑ **Corrected 14 Nov (S357cl).** The first credit here said "Sérgio Galvão Roxo's own loops". That was wrong:
  his words, "I didn't do it". The loops were made with Treblo, an AI music tool, and are kept in the project's
  `Pc_Simulation/Sources/Jingle_Brand New/` folder. He also said "it wasn't that great", so job 25 replaces them with music
  made in code. Until then: "Morning Joy Loop – Hope Path Loops" under the lessons; "– Guided Future Jingle" (C1); "– Better Version Jingle" (C2, with wow and flutter);
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
python3 script_rows.py && python3 make_doc.py && python3 make_page.py   # this file and the review page (make_doc.py writes the opening and §1 only: §2 and §3 were folded in by hand, S387 — keep them if you regenerate)
```


*Sections 2 and 3 were written by a second helper (B2/B3) in their own file and folded in here by the orchestrator (S387). Scripts and storyboards only: no video until his yes. Frames, frame sources and the page fragment are in `output/teaching-tapes/` (not in git): `2016/storyboard/`, `2026/storyboard/`, `storyboard-src/`, `page/storyboards.html`.*

## 2. 2016 — "Heartwood", Session Two: The Roots (a women's course video)

### 2.1 What it is

**HEARTWOOD · a course for women · Session Two: The Roots.** One session video of a six-session women's course, as a
2016 ministry would have made it: streamed on the platform (GracePlatform, the 2016 room's own mark) and sold on DVD with a
Leader's Edition and a member book. It teaches *why you are like this* for women: the Tree Model of 2012, filled with the
2001 booklet's causes, and it ends on the 1990 dependency booklet that is still in print. It says aloud that its teaching is
old: the small print of its opening reads "Heartwood draws on classic teaching first published 1984–2001", and segment 5
says "an older teaching — 1993". Six segments, three mid-roll adverts, 3 min 38 s.

### 2.2 The look, and why it is period-true

**The look: a Bible-journaling session, filmed from above.** An overhead camera on a whitewashed table in soft morning
light. The presenter is never seen: only her hands, in an oatmeal knit sleeve, lettering and painting the teaching into a
dot-grid journal in real time, with a warm, close voice-over that calls the viewer "friend". Brush-script titles, a
Playfair-italic serif, a clean Lato sans; sage, blush and rose watercolour; washi tape; a mug of coffee and a eucalyptus
sprig at the edge of frame. A course bug top left ("Heartwood | PART 3 OF 6 · The Score Card"), sentence-case closed
captions on a dark box, and a member-book page (the "viewer guide", fill in the blanks) that slides in beside the journal.
The adverts are the streaming platform's own mid-roll spots in flat 2016 web design (long shadows, flat colour, an "Ad ·
0:09" badge, an amber progress bar, "You can skip this ad in 5").

**Why it is period-true.**
1. *Documented shape.* A women's course in these years is a workbook of 12–20 sessions with timed blocks, a leader's guide
   and a DVD (Harvest USA 2012 workbook, SOURCES §4 "2016" item 1; RESEARCH_DYKAS session anatomy). Its diagram is the Tree
   Model (soil, roots, fruit; §4 item 2). A ministry film was sold in a "Regular" and a "Leader's Edition" (§4 item 3), and
   the Restored Hope Network's list of August 2014 names a 2014 "video Curriculum" (RHN14 p. 1).
2. *Documented continuity.* The old texts were still served and sold in 2014–2016: RHN's 2014 list still prescribes the
   1990 dependency booklet (RHN14 p. 4); the 2001 women's model was reposted online in June 2016 ("Lesbian Roots", his saved
   copy, LR16); Exodus Global Alliance sold the booklet as a "5 Pack" in June 2016 (§1 item 5; page not saved, only what §2
   says). So a 2016 course teaching 1987–2001 material is the honest picture, and the tape says so.
3. *Design reasons (not dossier claims; general design history, [VERIFY SOURCE] before any claim):* the mid-2010s
   Bible-journaling fashion in women's devotional culture (wide-margin journaling Bibles, watercolour, hand lettering); the
   overhead "hands only" how-to video that filled social feeds in 2015–2016; the bullet journal's dot grid; the
   brush-script-plus-serif type of lifestyle blogs; the whitewashed "farmhouse" table; skippable mid-roll adverts on
   streamed video; flat design with long shadows. The hands-only camera also keeps the law: no face, ever.
4. *Unlike the other two.* The 1997 tape is a filmed felt board, CG on navy, 4:3 VHS; the opening advert is sunbursts,
   pedestals and chunky 3D type. 2016 is 16:9 HD, daylight, paper and paint, no tape artefacts, no TV graphics.

**Colour.** Every base colour is a token from `src/desktop/theme/` (CAL_2016, CAL_1997, era4 `PLACE`, ERA3; the list with
keys is at the top of `storyboard-src/common.js`). Paint layers and shadows are those tokens at low alpha. No new swatch.

### 2.3 Running order

| time | piece | length |
|---|---|---|
| 0:00 | Open: the journal, "Heartwood", Session Two | 10 s |
| 0:10 | 1 · The Big Three (the tree, the soil) | 25 s |
| 0:35 | 2 · Defensive Detachment | 23 s |
| 0:58 | Ad · "Too Close?" five-pack | 12 s |
| 1:10 | 3 · The Score Card | 23 s |
| 1:33 | 4 · Words to Fear, Words to Hear (for girls) | 22 s |
| 1:55 | Ad · "Becoming Her" at the Summer Gathering | 12 s |
| 2:07 | 5 · No File to Put It In | 23 s |
| 2:30 | Ad · GracePlatform Deep Roots, 20 weeks | 12 s |
| 2:42 | 6 · When Friendship Becomes Everything (the death grip; the centre that belongs to God; the signs; **the collapse**) | 48 s |
| 3:30 | End card | 8 s |

Segment 6 runs long on purpose: it carries the collapse, and the collapse needs a held, silent page.

### 2.4 The script, with sources

*N = the presenter's voice-over (spoken, captioned). PAGE = what her hand letters. VG = the viewer-guide insert. AD = an
advert's voice. Every spoken and lettered line is new writing unless marked verbatim.*

**Source keys.** **R87 / R90** = Rentzel, *Emotional Dependency*, B2 F9 (`Nov additions/NMAH-AC1428-B002-F009.pdf`): the
1987 Exodus edition (PDF pp. 1–15) and the 1990 IVP edition (PDF pp. 17–34); PDF page = OCR page, checked against
`ocr/NMAH-AC1428-B002-F009.txt`. **FOF-F** = Focus on the Family, *the heart of the matter* (2001), B6 F4
(`Boy Erased/New/NMAH-AC1428-B006-F004 (1).pdf`); PDF pages as RESEARCH_ROOTS §2B gives them (Vision re-read), wording
checked in the local MD. **LR16** = "Lesbian Roots", the June 2016 copy he saved (`Nov additions/www-sorrowfulhearts-com-
lesbianroots-html.md`; "l." = line of that file). **PR-02 / PR-09** = Exodus booklets in B2 F12 (`New/NMAH-AC1428-B002-
F012.pdf`), © 1993; pages as RESEARCH_ROOTS §2B, wording checked in the local MD. **B3F3** = the typed outline of 23 Jan
1989 (`Nov additions/NMAH-AC1428-B003-F003.pdf`). **SSW12** = Harvest USA, *Sexual Sanity for Women* (2012), printed pages
via RESEARCH_DYKAS. **RHN14** = RHN "Suggested Books by Category" (PDF made 11 Aug 2014; `Nov additions/recommended_books.pdf`).
**RES** = RESEARCH_ROOTS_CAUSES_LIA; **SRC** = SOURCES_TO_FETCH_2016_2026.

| time | who | line | source (document, page) |
|---|---|---|---|
| 0:00 | PAGE | **Heartwood** · SESSION TWO · THE ROOTS · *a course for women* · six sessions · viewer guide inside | invented title; the course form: SSW12 (20 sessions, timed blocks; RESEARCH_DYKAS) |
| 0:03 | N | Grab your journal and your viewer guide, friend. Today we go underneath. | invented; form: SSW12 session opening and viewer prompts (RESEARCH_DYKAS "Exercises") |
| 0:03 | small print | Heartwood draws on classic teaching first published 1984–2001. | invented; the dates are R87 p. 3 (© 1984, 1987) and FOF-F (© 2001) |
| 0:10 | PAGE | *Out of the heart* · Luke 6:45 · the tree painted across the spread: fruit, roots, soil | SSW12 pp. 9–10, 14–18 (the Tree Model; a tree known by its fruit) |
| 0:12 | N | Every tree is known by its fruit. But fruit grows from roots, and roots grow in soil. | SSW12 pp. 9–10, 14–18 (paraphrase) |
| 0:18 | PAGE | in the soil: a mother who seemed distant · a father's score card · words from other kids · media & schools | FOF-F PDF pp. 8–9 (the "preconditioning factors"); LR16 l. 53 ("media influences; public school and university curricula") |
| 0:22 | N | For women, the classic teaching names three things in the soil: our relationships, our identity, and how we picture God. | FOF-F PDF p. 8 (printed 10) and p. 10 (printed 14–15): "THE BIG THREE" (relationship issues, an identity struggle, a spiritual fallacy); LR16 l. 53 |
| 0:22 | PAGE | RELATIONSHIPS · IDENTITY · A PICTURE OF GOD, stepped like stairs in the soil | FOF-F PDF p. 8 (the three stepped like stairs, RES §2B B2) |
| 0:30 | N / PAGE | It's not a sexual orientation problem. It's an identity crisis. (PAGE, on the trunk: *identity crisis*) | **verbatim** "not a sexual orientation problem; it is an identity crisis": FOF-F PDF p. 10 (printed 15); LR16 l. 127 |
| 0:35 | PAGE | DEFINITION · *defensive detachment* (n.) · watercolour: a toddler's shoes turned away from a woman's shoes on a doormat | FOF-F PDF pp. 11–12 (the DEFINITION box, RES §2B B4); the drawing is ours |
| 0:37 | N | A little girl first learns who she is from her mother. | FOF-F PDF pp. 11–12: the bond is "the foundation of her complete feminine identity" (paraphrase) |
| 0:42 | N | If Mom seems distant, critical or overbearing, she may pull back to protect herself. The teaching calls it defensive detachment. | LR16 l. 141 ("distant, bitter, critical, overbearing"; "defensive detachment"); FOF-F PDF pp. 11–12; the term is credited there to a 1989 LIA training series (RES §2B B4) |
| 0:50 | N | Even a hospital stay can interrupt that first bond. | LR16 l. 131 ("hospitalization may interrupt the initial bonding process") |
| 0:54 | VG | She may begin to ________ her own sex. | FOF-F PDF pp. 11–12 (she then distrusts her own sex, RES §2B B4); the fill-in form is a design choice |
| 0:58 | AD | *Too Close? (see 2.6)* | |
| 1:10 | PAGE | REPORT CARD · *a little girl* · from Mother: the MODEL ♡ · from Father: the GRADE ? · passing ☐ failing ☐ | Smid PR-02 PDF p. 6 ("score card"); FOF-F PDF p. 12; the drawing is ours |
| 1:12 | N | A girl looks to her mother for the model, and to her father for the grade. | FOF-F PDF p. 12 (printed 18–19; RES §2B B5) (paraphrase) |
| 1:18 | N | His words become her score card: passing or failing as a little girl. | PR-02 PDF p. 6: **verbatim** "the score card of passing or failing as a little girl" (© 1993) |
| 1:24 | N | From about eighteen months, Dad needs to come alongside her. | FOF-F PDF p. 12 (at 18 months the father must "come alongside", RES §2B B5) |
| 1:24 | PAGE | mirror · lipstick · Mum / church dress · Dad | PR-02 PDF p. 6 (the booklet's own healthy examples, RES §2B B5) |
| 1:28 | VG | p. 31: 1. A girl looks to her mother for the ______ and to her father for the ______. 2. His responses become her ______ ______ of passing or failing as a little girl. 3. Fathers should come alongside at ____ months. | the three lines above |
| 1:33 | PAGE | WORDS TO FEAR (grey pencil) / WORDS TO HEAR (rose brush) | FOF-F PDF p. 13: the panel "THE POWER OF WORDS" (local MD) with WORDS TO FEAR / WORDS TO HEAR |
| 1:35 | N | Words plant seeds. Some of them are words to fear. | invented; FOF-F PDF p. 13 ("Innocent friends can plant seeds of confusion", local MD) |
| 1:38 | PAGE (fear) | "Thanks, young man!" · "She should have been the boy." · "Why can't you be more like the girl next door?" · "Women don't lead here." | **invented lines, one for each documented category** (B1.9: no slurs, no quoted name-calling): adults calling her "son" or "young man"; told she should have been a boy; compared to a "girly" neighbour; the church saying a woman is worth less (FOF-F PDF p. 13, RES §2B B6). "Should have been a boy" also B3F3 p. 3 (1989) |
| 1:42 | N | Being told she should have been a boy. Grown-ups calling her "young man". | FOF-F PDF p. 13; B3F3 p. 3 (categories, not quotes) |
| 1:48 | PAGE (hear) / N | "There's my girl." · "You matter as much as anyone here." / And words to hear: a father who calls her his girl. A church that tells her she has equal worth. | FOF-F PDF p. 13 (a father calling her his precious little girl; the church saying she is of equal worth); lines invented |
| 1:55 | AD | *Becoming Her (see 2.6)* | |
| 2:07 | PAGE | *a computer analogy* (an old teaching, 1993) · a floppy disc drawn as the Save icon, labelled *woman* | PR-02 PDF p. 11 (printed 19), © 1993: "To use a computer analogy" |
| 2:09 | N | Here's a picture from an older teaching — 1993. Remember floppy disks? | PR-02, © 1993; the question is ours (in 2016 the floppy survives as the Save icon) |
| 2:14 | N | A straight woman has a disc labelled "woman". Every affirmation of her femininity is saved there. | PR-02 PDF p. 11: a heterosexual woman "has a floppy disc that is titled 'woman,'" and each experience of her femaleness "can be stored in that file" (paraphrase) |
| 2:21 | N | A lesbian receives the same affirmation, but she has no file to put it in. It gets lost. | PR-02 PDF p. 11: **verbatim** "she has no file to put it in"; the affirming experiences "get lost" |
| 2:21 | PAGE | Save to… church · work · family · friends · [ "woman" — no folder ] · *no file to put it in* → lost; a real 3.5" disc lies on the page | the drawing is ours |
| 2:30 | AD | *GracePlatform Deep Roots (see 2.6)* | |
| 2:42 | PAGE | a lifeguard's ring; two hands locked on an arm; *death grip* | PR-09 PDF pp. 18–20 (the lifeguard image; "death grip relationship", local MD) |
| 2:43 | N | Lifeguards are warned about a swimmer so frantic she locks her arms round her rescuer. One teaching calls dependency a death grip. | PR-09 PDF pp. 18–20 (paraphrase; **verbatim** "death grip"). The booklet's next words (both drown) are not voiced |
| 2:52 | N | Emotional dependency is when someone else's presence feels necessary for your security. | R90 PDF p. 21: dependency "occurs when the ongoing presence and nurturing of another is believed to be necessary for personal security" (paraphrase) |
| 2:57 | PAGE / N | a circle lettered GOD; a blank slip of washi tape slides over the centre / When anyone takes the centre that belongs to God, the old booklet calls it idolatry. | R87 PDF p. 4 (a relationship "made central to existence instead of God"; "transgression"); R90 PDF p. 24 ("the idolatry which takes place when something or someone, other than God, is at the center of our lives"). The slip never carries a name |
| 3:04 | N | Here are the signs. | R90 PDF p. 22 ("let's look at the signs") |
| 3:05 | PAGE | DEPENDENCY · *warning signs*: ☑ time alone together ☑ jealous of others ☑ no plans without her ☑ pet names, private jokes ☑ wearing her clothes ☑ poetry, "our song" ☑ moving in together | R90 PDF p. 22 (the signs: jealousy and exclusivism; time alone; no plans that do not include her); PDF p. 25 (the manipulations: "special nicknames"; "wearing each other's clothing"; poetry and music; "moving in together"); PDF p. 30 ("our song") |
| 3:10 | N | Whether or not anything physical happens, sin has entered the friendship. | R90 PDF p. 22: "Whether or not physical involvement exists, sin takes place when a friendship becomes a dependent relationship" (paraphrase); R87 PDF p. 4 |
| 3:16 | PAGE | the page turns: FRIENDSHIP (*healthy*: includes others · free and generous · happy she has others) · DEPENDENCY (the seven, ticked) · MARRIAGE (*appropriate*: the same seven, each with a heart) | R90 PDF p. 22 (a healthy friendship is "free and generous", includes others, is glad when a friend "hits it off" with someone else; also R87 PDF p. 5); PDF p. 26 for the third box |
| 3:18 | N (warmly, as reassurance) | Now, many of these things aren't sinful in themselves. | R90 PDF p. 26: **verbatim** "many of these things are not sinful in themselves" |
| 3:21 | N / PAGE | **Romantic gestures and certain kinds of exclusivity are completely appropriate in marriage and engagement.** | R90 PDF p. 26 (printed 16): **verbatim**. Lettered plainly in sans, not script |
| 3:26 | N | …and sometimes even in a serious dating relationship. | R90 PDF p. 26: **verbatim** |
| 3:27 | — | The pen is set down. No music. The three boxes hold for four seconds. | |
| 3:30 | PAGE | the journal closes · Heartwood · Session Two · Discussion questions are on page 33 of your viewer guide. | invented; form: SSW12 (each session ends in discussion questions) |

### 2.5 The storyboard

Six frames, drawn and rendered at 1920×1080 (`output/teaching-tapes/2016/storyboard/`, contact sheet
`2016_contact_sheet.jpg`; sources in `storyboard-src/f2016.html`, `set2016.js`, `common.js`):

1. **F1 · Open** (0:03). The spread from above; "Heartwood" lettered over a sage wash, the hand finishing the *d*; the
   verse box taped in; the small print at the foot.
2. **F2 · The Big Three** (0:22). The watercolour tree across the spread; the soil list on the left page; the three stairs
   in the soil; *identity crisis* on the trunk; the hand lettering A PICTURE OF GOD. **This drawing is reused by the 2026
   course (G2).**
3. **F3 · The Score Card** (1:28). The report card on the left page, the presenter's notes on the right, the viewer-guide
   page sliding in.
4. **F4 · Ad: Too Close?** (1:02). The five booklets fanned, the cover of two women seen from behind, the checklist,
   "$1 each · sold in fives", the player's ad badge, skip box and amber bar.
5. **F5 · No File to Put It In** (2:21). The floppy drawn as the Save icon; the "Save to…" dialog with no folder for
   "woman"; a real disc lying on the page.
6. **F6 · The collapse** (3:27). Three boxes; the same seven items ticked as warnings and hearted as appropriate; the
   booklet's sentence lettered plainly; the pen set down.

Shot list for the segments not framed: segment 2 = the DEFINITION card taped in, then the doormat drawing; segment 4 = two
columns lettered line by line, grey pencil then rose brush; segment 6a = the lifeguard ring, 6b = the GOD circle and the
blank slip.

### 2.6 The commercials

All three are the platform's mid-roll spots ("Ad · 0:12", "You can skip this ad in 5", the skip never pressable on a
TV), flat 2016 design, stock-style drawings with no faces, invented marks, documented products and prices. None is built
on the 265-women survey's abuse percentages (RES §5A5).

1. **"Too Close?" five-pack** (0:58, 12 s). AD: "Is a friendship getting too close? The little booklet with the
   checklist. Order a five-pack for your group." Screen: *Too Close?* · when a friendship becomes everything · with a
   checklist · ticks (wanting time alone together · jealous when she sees others · no plans without her · "our song") ·
   $1 each · sold in fives · GracePlatform Store. *Sources:* the booklet at $1.00 (R87 PDF p. 15); FOF's 2001 order page,
   $1 "with a checklist" (FOF-F PDF p. 21, RES §4B #1); Exodus Global Alliance's "Emotional Dependency, 5 Pack", June 2016
   (SRC §1 item 5, page not saved); still on RHN's 2014 list (RHN14 p. 4); the ticks from R90 pp. 22, 30. The name is
   RES §8E #1; the cover is drawn in the manner of the 1987 cover (two women, one resting her head on the other), seen from
   behind, never a copy (RES §8G4).
2. **"Becoming Her" at the Summer Gathering** (1:55, 12 s). AD: "Two days. Workshops. Worship. And on Saturday afternoon,
   the makeover hour. Every session online afterwards." Screen: SUMMER GATHERING · 2 days · workshops · *Sat 2:00 Becoming
   Her: the makeover hour* · all sessions online after (audio) · a lipstick, a compact (its mirror shows only light), a dress
   on a hanger. *Sources:* the conference shape (RHN 2013–2015 pages: two days, a church or hotel, workshops, a testimony
   track, recordings online afterwards; SRC §2A.2–4, §4 item 4); the makeover session at the annual Exodus conference
   (FOF-F PDF p. 17, 2001; RES §4B #6) and clothes shopping as cure (PR-09 PDF p. 22, 1993). **Date flag:** the makeover is
   documented 1993–2004, not in 2016.
3. **GracePlatform Deep Roots, 20 weeks** (2:30, 12 s). AD: "Twenty Monday evenings. A hundred and fifty dollars covers
   your materials. Ask about payment plans." Screen: DEEP ROOTS · 20 weeks · Mondays · $150 covers your materials · payment
   plans · women and men welcome · GracePlatform. *Sources:* a 2016 Living Waters group: 20 weeks, Monday evenings, $150 for
   materials, payment plans, men and women (SRC §1 item 6 / §2A.10; posted 29 Mar 2016; not saved: only what §2 says); LIA's
   20-week group at $200–$300 (B1 F19 PDF pp. 3–4, RES §4B #7). The name is RES §4B #7.

Not used, for his choice: "Sisters, Safely" ($20 video, RES §4B #2); "Liberated From Liberation" (§4B #3; it would aim the
joke at feminism); a parents' prayer list (Sorrowful Hearts, live 2013–2026, §7A12), kept for 2026.

### 2.7 The collapse, and why it is the plainest

**The collapse:** the presenter reads, as the reassurance it is in the booklet, that "romantic gestures and certain kinds
of exclusivity are completely appropriate in marriage and engagement, and sometimes even in a serious dating relationship"
(R90 PDF p. 26), while the same seven items she has just ticked as warning signs are copied into a third box marked
*appropriate*.

**Why it is the plainest.**
1. It is the source's own sentence, from the booklet the 2016 room's record calls "the leaflet". It is dated (1990), it
   was still reprinted (an 11th printing in 2002 by its print line, [VERIFY the convention]; RES §8C item 12) and still prescribed in 2014 (RHN14 p. 4).
2. It collapses the definition, not a detail. The same gestures are "manipulation" between two women and
   "completely appropriate" between a man and a woman, even when they are only dating. The only thing left that decides the
   box is who.
3. No satire is added. The course voice stays sincere; the collapse happens on its own page.
4. It needs no harm figure, no death, no abuse (all of which stay off the tape) and no outside argument.
5. The in-house class version of the booklet leaves this sentence out (LIA's outline, B1 F4 pp. 26–29; RES §8B2 item 2).
   The tape only puts it back.

*Other give-ways in the same sources, not used as the collapse:* "no one cause of lesbianism can be pinpointed" (LR16
l. 187); "one of the most curable ailments known to humanity" (R90 PDF p. 32) beside a long war of separation (pp. 29–32);
"officially" any friendship (R87 PDF p. 7) but pictured as two women (R87 PDF p. 1).

### 2.8 Where it meets Vera

Read from `data/dialog/s3_vera.json`; nothing there changes.
1. **The category.** Her record is "Filed as: emotional dependency". Segment 6 is that category, taught from the same
   booklet, which RHN's list still prescribed in August 2014, the year of her story (RHN14 p. 4).
2. **Her published line.** "A dependency had taken the place of God in my life" (`record.publishedText`) is the booklet's
   own frame (R87 p. 4; R90 p. 24). The blank slip sliding over GOD is the mentor's rule beside her record: "Name the
   dependency, not the person."
3. **Her sent line.** "We had lived together" is the last item ticked on the tape's list ("moving in together", R90
   p. 25). It is also one of the runs the house rule cuts from her story (`ownCut`).
4. **The missing box.** "I think what I had with her is what the leaflet calls dependency. I don't have a word for the part
   that wasn't." The three boxes are the leaflet's whole vocabulary: friendship, dependency, marriage. Her part has no box.
   That is the collapse, and it is her sentence that names it.
5. **Care.** The tape never shows Vera, never names Nuala, never writes a name on the slip. Vera is never the punchline (RES
   §8F2 item 4).

### 2.9 What is placeholder or invented

- The course name *Heartwood*, *Too Close?*, *Becoming Her*, *Summer Gathering*, *Deep Roots* (clearance check before any
  use); GracePlatform is the room's existing mark.
- Every spoken and lettered line except those marked verbatim; the presenter's voice; the viewer-guide page numbers.
- The four "words to fear" and two "words to hear" (invented, one per documented category).
- The look (2.2, item 3) is a design argument, not a documented 2016 women's-course set (SRC §4 item 7: none was found).
- The makeover hour in a 2016 conference (documented 1993–2004 only).
- Lengths are estimates for a later cut; no audio exists.

### 2.10 Eye list (2016)

1. The look: overhead Bible-journaling, hands only. Does it read as 2016 to you, and as women's ministry?
2. The title *Heartwood* and "Session Two: The Roots".
3. The six segments and their order (all six of the brief's list; 6B7 folded into segment 6).
4. Segment 6's title: "When Friendship Becomes Everything" (invented). The booklet's real subtitle was avoided on screen.
5. The collapse (2.7): the presenter reads the marriage sentence warmly, as reassurance. Alternative: a closing discussion
   card, "Which box describes your closest friendship?" (sharper, but it turns the course voice towards a joke; not used).
6. The three commercials, especially *Becoming Her* (its date flag) and the five-pack's cover (two women from behind).
7. The invented "words to fear" lines.
8. The floppy disc as the Save icon (2016's own echo of FloppySheep).
9. Whether the tape should also play in Vera's room, on the TV he proposed.

## 3. 2026 — "HEDGE™", a course for parents in a confused age

### 3.1 What it is

**HEDGE™ · a course for parents in a confused age · free, donor-supported.** A six-lesson video course a family is sent
about their child, made in the grammar of the 2026 anti-gender campaign film. This tape is the course's "When she is 18"
cut: a cold open, six lessons and three adverts, 3 min 48 s. It teaches the old roots under new labels on the very tree the
2016 course drew; it hands the parent the minors' toolkit; then its own source grants an adult daughter "the liberty to make
their own choices", and the course, with nothing left to teach, sells time and a chat that books a free call. The name comes
from the "hedge of thorns" prayer on a parents' page that is still live (SSA Hope, SRC §7A3); the hedge grows over the
family's house all through the tape.

### 3.2 The look, and why it is period-true

**The look: the campaign course.** Cinematic 2.39:1 letterbox. Night, rain, a teal-and-amber grade, film grain. AI-gloss
"stock footage" with no faces: an empty swing in slow motion, a suburban house with one lit window, a hand on a door lever,
a hand peeling a label, a router's lights going out, a kitchen at night. A glossy hedge that grows a little in every lesson
and ends over the window. Huge condensed capitals burned in word by word, one word boxed in red. A worried parent's
voice-over against a calm host. Swelling strings and a heartbeat (for the later cut). In the top bar, all through: a red
pill, FREE WEBINAR · LIVE IN 00:14:59, counting down. In the bottom bar: "Dramatisation. Voices are actors." and a line of
fine print that gives each lesson away. One advert is a vertical phone clip played on the TV with a blurred copy of itself
at the sides.

**Why it is period-true.**
1. *Documented form.* The parents' material of 2024–2026: free, donor-supported short video teachings with run-times (an
   e-course of timed teachings at $35, including a 36-minute teaching for parents; a half-day summit for parents in an
   "identity confused" culture; a free Friends & Family group; free coaching, "1 hour" or "40 minutes"; an AI assistant;
   SRC §7A1); a free 8-lesson parents' video course whose lessons 3–4 are "The Tree Model Applied to a Gender Confused
   Generation" (Harvest USA 2024, SRC §1 item 2, page not saved, title only); a prayer list with a pledge, still live
   (Sorrowful Hearts, checked 14 Nov 2026); a church's 2025 video course built on "identity" (IDS25).
2. *Documented campaign grammar.* Autumn 2026 campaign ads built on a child, a bathroom, a surgeon, public money, some
   AI-made by the campaigns' own account or by reporting (The Campaign File, SRC §3D.1, a finding aid; §4 "2020s" item 7).
   The UN's account of the method: "vigorous social media messaging, simple, catchy slogans", adaptable anywhere (UN21 p. 5
   §11); children's innocence at its heart, a "policy of fear" (p. 11 §33); 297 submissions copied from three templates
   (p. 3). TNI 2026: parenthood "elevated … as a political identity and the child as a sacred figure" (TNI26 p. 4).
3. *Documented front door.* Three dated 2026 chat doors (SRC §7E): a ministry's "biblically-trained AI Assistant" that
   hands visitors to a human "for FREE" (LTAI, printed 14 Nov 2026; menu item from Oct 2025, widget from June 2026, §7A1);
   a parent-coaching bot that "remembers you", takes "a text or email from your child" and "can write scripts" (RB26, B,
   borrowed for the look only, as §7E allows); a men's SSA writer's chatbot (Jan 2026).
4. *Design reasons (not dossier claims; [VERIFY SOURCE] before any claim):* word-by-word captions made for silent autoplay;
   glossy AI-made stock; evergreen-webinar countdowns; vertical phone video played on TVs.
5. *Unlike the other two and the advert.* No drawing hand (2016), no felt board or VHS (1997), no sunbursts or pedestals
   (the advert). The only drawing on the tape is the 2016 tree, scanned and stickered.

**Colour.** Base colours are tokens from `src/desktop/theme/` (ERA4, PLACE, CAL_2026, CAL_2016, CAL_2003): the red is
`PLACE.book`, the hedge is the 2016 calendar's pine (`CAL_2016.pine`, the same green ten years on), the lit window
`CAL_2026.bulb`, the course's leaf `CAL_2026.flagGreen`. List in `storyboard-src/common.js`.

### 3.3 Running order

| time | piece | length |
|---|---|---|
| 0:00 | Sting: HEDGE™ | 5 s |
| 0:05 | Cold open · "Your child is being confused" | 25 s |
| 0:30 | Lesson 1 · The Same Tree | 28 s |
| 0:58 | Ad · LAST LINE LIVE (vertical clip, the countdown) | 13 s |
| 1:11 | Lesson 2 · Contagion | 25 s |
| 1:36 | Lesson 3 · Don't Say the Word | 22 s |
| 1:58 | Ad · The Prayer Wall | 12 s |
| 2:10 | Lesson 4 · Close the Gates | 22 s |
| 2:32 | Ad · GateKeep™ | 12 s |
| 2:44 | Lesson 5 · When She Is 18 (**the collapse**) | 30 s |
| 3:14 | Lesson 6 · Ask Anytime (the front door) | 28 s |
| 3:42 | End card: LIVE NOW | 6 s |

From §7B's spine: "Grieve. Then Guard." is folded into the Prayer Wall advert and the course's name; the collapse runs
straight into the door, with no advert between them, because the door is what the course sells once it has nothing left to
teach.

### 3.4 The script, with sources

*PARENT = the worried parent's voice-over (an actor; invented; dramatisation). HOST = the course's calm presenter.
CAPTION = burned-in capitals (* marks the red word). FINE = the fine print in the bottom bar. SCREEN = on-screen text.*

**Source keys.** **BB19** = "The Building Blocks of Gender Confusion" (© 2019; `Nov additions/Building+Blocks+of+Gender+
Confusion.pdf`), OCR page. **LTFP** = the ministry's family post "Responding to Family Members Who Have Embraced Gender
Ideology" (dated 31 Oct 2025; archived 10 Apr 2025; the key sentences re-read from the live page, read-only, on 14 Nov 2026
for this file). **Not in his folder: print it** (SRC §7D item 3). **LTAI** = the ministry's /ai page, printed 14 Nov 2026
(`Nov additions/Love & Truth Network _ AI Assistant.pdf`, 1 p.). **LT§7A1** = facts read from the ministry's live site for
SRC §7A1 (not in his folder). **GIST15** = `GIST-GOSPEL-AND-SEXUALITY.pdf`. **IDS25** = `Identity-Shift-student-workbook-
Discussi-92.pdf`. **HV22** = `Jesus-and-Your-Unwanted-Journey-PG.pdf` (Harvest USA 2022), OCR page. **ERLC14** =
`Sexual-Brokenness-Book.pdf`. **TF21** = `Sexual-Holiness-Wholeness-Brokennes-Task-Force-Report.pdf`. **ICCEC21** =
`Human-Sexuality-Addendum-1-Sexual-Brokenness.pdf`. **UN21** = A/76/152 (`n2119214.pdf`). **TNI26** =
`State-of-Power-2026-Chapter9.pdf`. **RB26** = `RepairBot _ ROGD Repair.pdf` (**B**: a secular parent-coaching product;
look only). **SH-P** = Sorrowful Hearts "Parents" page (live; re-read 14 Nov 2026). **SSAH** = SSA Hope parents' page
(SRC §7A3; not saved, not re-checked here). All in `~/Pc_Simulation/Sources/Boy Erased/Nov additions/` unless marked;
OCR page = PDF page.

| time | who | line | source (document, page) |
|---|---|---|---|
| 0:00 | SCREEN | A hedge grows into the letters **HEDGE™** · a course for parents in a confused age · Free. Donor-supported. | name from the "hedge of thorns" prayer (SSAH, §7A3); "donor-supported": HV22 p. 165; LT§7A1 (About page) |
| 0:05 | — | an empty swing in slow motion at dusk → the house at night, rain, one window lit → the hedge at the frame's edges, beginning to climb | the brief's stock grammar; §7B1 look |
| 0:07 | PARENT | I thought I'd know. I thought I'd see it coming. | invented (an actor; "Dramatisation" on screen) |
| 0:11 | CAPTION | YOUR CHILD IS NOT CONFUSED. / YOUR CHILD IS *BEING CONFUSED. | invented; rests on LTFP (a culture "swept up by gender ideology") and the trans shelf's "recruitment into transgender ideology" (a publisher's blurb, LT§7A1); §7B1 |
| 0:17 | HOST | It isn't your fault. It's the culture — a culture swept up by gender ideology. | LTFP: **verbatim** "swept up by gender ideology"; ICCEC21 p. 4 (beliefs taught through "public education, popular culture, and social media") |
| 0:23 | CAPTION | YOU ARE THE LAST LINE. | invented. Claim side, for the dossier only: UN21 p. 11 §33; TNI26 p. 4 |
| 0:05–0:30 | FINE | No one is certain what causes gender confusion. | BB19 p. 1: **verbatim** |
| all | small print | Dramatisation. Voices are actors. HEDGE is free and donor-supported. | invented (it also keeps testimony off the tape) |
| 0:30 | — | the 2016 *Heartwood* spread, scanned (softer, cooler), tilted on black glass; stickers slapped over the old words one by one, the old words showing at the edges | the reuse is the brief's (B3.1); the drawing is 2016 F2 |
| 0:32 | HOST | The roots haven't changed. A parent who didn't nurture. A parent who got too close. A child who felt different. | BB19 p. 3 (the same-sex parent did not give "the nurturing that they needed"; the opposite-sex parent "may become enmeshed"; "felt different") |
| 0:40 | SCREEN | stickers: a mother who seemed distant → **AN ENMESHED PARENT** · a father's score card → **A FATHER WHO DIDN'T NURTURE** · words from other kids → **SOCIAL CONTAGION** · media & schools → **GENDER IDEOLOGY** · identity crisis → **IDENTITY** · on the fruit, a red **NEW** | BB19 p. 3 (enmeshed; did not nurture; rejected by neighbourhood kids, "felt different"); BB19 pp. 3–4 ("social contagion effect"); ICCEC21 p. 4 and LTFP (gender ideology); GIST15 p. 13 and IDS25 (identity). The table of relabellings is SRC §7B |
| 0:46 | HOST | The building blocks, one ministry writes, are much the same as they always were. Only the fruit has a new name. | BB19 p. 2: "Many of the building blocks of transgender issues are similar to those of homosexuality" (paraphrase); the second sentence is invented |
| 0:52 | CAPTION | SAME ROOTS. *NEW NAME. | invented |
| 0:30–0:58 | FINE | The soil is influential but not determinative. | HV22 p. 95: **verbatim** (the Tree Model, "© Harvest USA, 2022", pp. 93–94) |
| 0:58 | AD | *LAST LINE LIVE (see 3.6)* | |
| 1:11 | — | a friendship map of blank avatars; dots turn red one by one, like an outbreak chart | §7B3 look |
| 1:13 | HOST | One friend comes out. Then another. Then your daughter. | BB19 p. 4: one person in a social group coming out "prompts many more in that social group" to do so (paraphrase); influencers, p. 4 |
| 1:19 | PARENT | She was always on her phone. I let her. | invented; ERLC14 p. 108 ("If your children have unmonitored access to the Internet, you are a negligent parent") |
| 1:24 | HOST / CAPTION | Share this lesson with five families. / SHARE THIS LESSON WITH *FIVE FAMILIES. · button SHARE HEDGE ×5 · the map lights again in the course's green, a leaf on every node: 5 → 25 → 125 | invented; **the lesson's give-way**: the course spreads the way it says ideology spreads. UN21 p. 5 §11 ("vigorous social media messaging, simple, catchy slogans"); p. 3 (three templates) |
| — | off the tape | "rapid-onset"; "particularly the case for females" (BB19 p. 3); every number | dossier only, both readings (Lexicon #54) |
| 1:36 | — | a hand peels a label off a jar (the label is blank); the jar goes back on a shelf of identical jars | §7B4 look |
| 1:38 | CAPTION | A FEELING IS NOT AN IDENTITY. | invented; IDS25 p. 16 |
| 1:42 | HOST | Feelings aren't facts. Because she feels it and thinks it doesn't make it true. | IDS25 p. 16: "Because I feel it and think it, doesn't make it true." (**verbatim**, pronoun changed) |
| 1:49 | HOST | You're not asking her to change her feelings. You're asking her to change her identity. | GIST15 p. 13: "The Gospel does not require transformation of one's sexual orientation, but one's identity". Written about orientation; the course carries it to gender, as IDS25 does (p. 14) |
| 1:36–1:58 | FINE | …a change in sexual identity with no, or little, change in orientation. | GIST15 p. 13: **verbatim**. (Also TF21 p. 6: "a change in attractions is not a measure of holiness") |
| — | care | The label stays blank. No name, no "Hello, my name is …" card, no deadname. | SRC §7A7 care; CLAUDE.md |
| 1:58 | AD | *The Prayer Wall (see 3.6)* | |
| 2:10 | — | a hallway at night; a hand turns the front-door lock; the router's lights go out one by one; a smartphone is lifted away and a flip phone set down; outside, the hedge reaches the porch | §7B5 look |
| 2:12 | CAPTION / HOST | UNDER YOUR ROOF, YOUR RULES. / While she lives under your roof, you set the rules. | invented (see 3.8: Dad's line) |
| 2:19 | HOST | A flip phone. One password, and you hold it. Count the texts. | IDS25 p. 21 (a flip phone; "have your spouse or family member be the only one with the password"); ERLC14 pp. 127–128 (monitoring; counting texts, SRC §7A5) |
| 2:10–2:32 | FINE | Forget trying to educate parents of seventeen-year-olds. | ERLC14 p. 139: **verbatim** (its context is dating and sex education) |
| 2:32 | AD | *GateKeep™ (see 3.6)* | |
| 2:44 | SCREEN | a slide. **UNDER 18** (red): FULL-COURT PRESS · CLOSE THE GATES · ONE PASSWORD: YOURS · A FLIP PHONE · COUNT THE TEXTS · PRAY A HEDGE AROUND HER · UNDER YOUR ROOF, YOUR RULES. **18 AND OVER** (dark): empty | the course's own lessons, above |
| 2:47 | HOST | Those under 18 can involve a full-court press approach… | LTFP: **verbatim** |
| 2:52 | SCREEN / HOST | one small line types itself in the empty column / …while young adults will have the liberty to make their own choices. | LTFP: **verbatim** (the same sentence) |
| 2:58 | — | the strings stop; the hedge stops growing; the countdown keeps going | |
| 2:59 | HOST | The liberty to make their own choices. | LTFP, read a second time |
| 3:03 | PARENT (quietly) | She's eighteen now. | invented |
| 3:06 | HOST | So love her over the long term. It can take seven to ten years. | LTFP: step 6 "Love Over the Long Term"; **verbatim** "It can take 7-10 years" |
| 3:10 | CAPTION / SCREEN | *7–10 YEARS · then a card: MONTHLY GROUP · FREE CALL · ASK HEDGE 24/7 | LT§7A1 (a monthly support group; free coaching; the AI assistant) |
| 3:14 | — | a kitchen at night: a mug, a hand resting by a phone (silhouette), the hedge pressed against the window; the chat slides up | §7B8 look |
| 3:16 | SCREEN | **Ask Hedge** · here 24/7 · biblically grounded | LTAI p. 1 ("Ask our biblically-trained AI Assistant"); "24/7": RB26 p. 1 (B) and the vendor's wording (LT§7A1, secondary). Invented mark; no ministry, person or vendor named |
| 3:17 | SCREEN (the parent, typed) | My daughter just turned 18. She says this is who she is. What do I do now? | invented |
| 3:20 | SCREEN (Ask Hedge) | You're not alone. You don't have to have every answer tonight. Would you like to talk to a real coach? It's free. | invented; LTAI p. 1 ("easily connect with a human for FREE"). It gives no clinical answer and makes no claim |
| 3:24 | SCREEN | ✓ Memory updated · her age: 18 · quick replies: Book my free call · Paste a message from her · Write what I should say | RB26 p. 2 ("Repair Bot remembers you"), p. 3 ("a text or email from your child"), p. 4 ("RepairBot can write scripts"): B, the look only (SRC §7E) |
| 3:28 | HOST | Ask anything, any hour. And when you're ready, a real person. Free. | LTAI p. 1 |
| 3:32 | SCREEN | YOUR FREE COACHING CALL · **60** MINUTES → BOOKED ✓ TUE 10:00 · **40** MINUTES | LT§7A1: the free help is "1 hour" on two pages and "40 minutes" on two others. **The lesson's give-way** |
| 3:36 | CAPTION | WHEN YOU'RE READY, A REAL PERSON. *FREE. | invented |
| — | off the tape | the /ai page's "Ask your questions about the Bible and mental health" | LTAI p. 1: no machine gives any clinical answer on the tape |
| 3:42 | SCREEN | the countdown reaches 00:00:00 → LIVE NOW · JOIN; the hedge has covered the house, one window still lit · HEDGE™ · Free. Donor-supported. | invented |

### 3.5 The storyboard

Six frames at 1920×1080 (`output/teaching-tapes/2026/storyboard/`, contact sheet `2026_contact_sheet.jpg`; sources in
`storyboard-src/f2026.html`, which loads the 2016 set to re-create and scan its tree):

1. **G1 · Cold open** (0:13). The house at night, the lit window, rain, the hedge climbing; YOUR CHILD IS NOT CONFUSED
   above, YOUR CHILD IS *BEING* CONFUSED below; the countdown; the fine print "No one is certain what causes gender
   confusion."
2. **G2 · The Same Tree** (0:44). The 2016 F2 spread, re-painted from the same code, scanned and tilted on black glass;
   five stickers over the old words, which still show at their edges; the red NEW on the fruit; SAME ROOTS. *NEW* NAME.
3. **G3 · Contagion** (1:26). Left, the red outbreak; right, the same map relit in the course's green, a leaf on every
   node; SHARE HEDGE ×5; SHARE THIS LESSON WITH *FIVE* FAMILIES.
4. **G4 · Ad: LAST LINE LIVE** (1:03). The vertical clip pillarboxed on the TV with its blurred copy: STARTS IN 00:14:59,
   a fist on a door lever in a crack of light, LAST LINE LIVE, SOMEONE HAS A PLAN FOR YOUR CHILD. *HAVE YOURS.*, SAVE MY
   SEAT, a generic side rail.
5. **G5 · When She Is 18** (2:56). The full UNDER 18 column; the empty 18 AND OVER column with one small typed line and
   its cursor; the countdown at 00:02:17.
6. **G6 · Ask Hedge** (3:33). The chat over the dark kitchen; the parent's message; the reply; "Memory updated · her age:
   18"; the three quick replies; the 60-minute card and the 40-minute confirmation.

Shot list for the lessons not framed: Lesson 3 = the label peeled off the jar, the jar back on the shelf; Lesson 4 = the
lock, the router, the flip phone, the hedge at the porch.

### 3.6 The commercials

Invented marks, documented shapes and prices. Never in a break: blockers, desistance, "rapid-onset" or any clinical claim;
any death or suicide figure; any survey harm figure; a country or a bans map; a real name, face or testimony; any real
organisation's name.

1. **LAST LINE LIVE** (0:58, 13 s; vertical clip). PARENT (as AD): "Someone has a plan for your child. Have yours. Free.
   Live. Tonight." Screen: ● LIVE · FREE WEBINAR FOR PARENTS · STARTS IN 00:14:59 · LAST LINE LIVE · a free half-day webinar
   · parents only · SOMEONE HAS A PLAN FOR YOUR CHILD. HAVE YOURS. · SAVE MY SEAT · Sponsored. *Sources:* the ministry's
   half-day summit for parents in an "identity confused" culture (LT§7A1, undated); the "recruitment" framing (a
   publisher's blurb on the trans shelf, LT§7A1); claim side for the dossier: UN21 p. 16 §51 (it records the claim that
   trans youth are victims of "external indoctrination"); online conference form (RHN 2021, SRC §4 "2020s" item 4). The
   countdown is the brief's.
2. **The Prayer Wall** (1:58, 12 s). AD: "Add her name. Every member prays for her, at least once a day." Screen: a dark
   wall of lit tiles, a candle and a first name on each, scrolling (invented names; never Maya, never a deadname) · THE
   PRAYER WALL · add her name · prayed for daily · TAKE THE PLEDGE. *Sources:* SH-P: a child added to the list "will be
   prayed for by all the members at least once a day"; a "Take the Pledge" button (live page, re-read 14 Nov 2026; first
   archived Dec 2013, §7A12). Name: §7B break 4.
3. **GateKeep™** (2:32, 12 s). AD: "Lock the gates. GateKeep reports to you, not to them. You hold the password." Screen: a
   glossy router; a chrome padlock slams on in slow motion; a phone goes grey, "Blocked by GateKeep"; a parent's hand closes
   on a key, PASSWORD: YOU · GateKeep™ · from $121 a year · billed yearly. *Sources:* IDS25 pp. 21–22 (accountability
   software at $121, $129 and $184 a year; a family member holds the password); ERLC14 p. 108. Name: §7B break 1.

The course's own sign-up, Ask Hedge, is Lesson 6, not an advert (B3.2 allows either).

### 3.7 The collapse, and why it is the plainest

**The collapse:** Lesson 5 fills the UNDER 18 column with everything the course has taught, then reads its own source for
the other column: "Those under 18 can involve a full-court press approach, while young adults will have the liberty to make
their own choices" (LTFP). The host reads the second half twice. The course then has nothing left to teach, so it sells
time: "It can take 7-10 years", a monthly group, a free call, a chat open all night.

**Why it is the plainest.**
1. It is the ministry's own sentence, in the post written for this exact family (a loved one who "embraced gender
   ideology"), dated, archived, and re-read on the live page for this file.
2. Maya is 18. Every tool the course hands the parent (the gates, the password, the flip phone, counting texts, the roof)
   is a minors' tool, and the course's own source says so. Nothing from outside the programme is needed.
3. It needs no clinical claim and no counter-statistic, so the clinical debate is never touched, let alone satirised.
4. It turns straight into the door. What the course does after its logic gives way (sell years, a group, a call, a
   24/7 chat) is the marketplace in one move.

*Smaller give-ways kept on the tape as fine print:* BB19 p. 1 ("No one is certain what causes gender confusion", the cold
open); HV22 p. 95 (the soil "not determinative", Lesson 1); the course spreading like the contagion it describes (Lesson 2);
GIST15 p. 13 (identity changes, orientation does not, Lesson 3); ERLC14 p. 139 (seventeen is already too late, Lesson 4);
60 minutes then 40 (Lesson 6). *Not used:* "He's not a God who texts or video chats with us" (HV22 p. 21) under the chat:
sharp, but it argues theology; the 60/40 is plainer.

### 3.8 Where it meets Maya, without changing the room

Read from `data/dialog/s4_v3.json` (the messenger, the mailbox, Second Thoughts); nothing there changes, and the tape never
shows or names Maya.
1. **The day.** The course is about a daughter who has "just turned 18". Era 4 is Fri 23 Oct, her 18th birthday.
2. **Mum.** Her email says: "I've been reading a lot. I don't understand all of it, but I'm trying. Please read these. For
   me." (`mail.emails.mum.after`). The room never says what she read. HEDGE is the kind of thing it was; no link to it is
   added anywhere.
3. **Dad.** "Not while you're under this roof." (Sep 2025, when she was 17) is Lesson 4's caption and the UNDER 18 column.
   "You're an adult now. Adults pay their own way." (today, `messenger.dad.today`) is the other column: in the room, the
   course's "liberty" arrives as a bill. The family post's own line: "Boundaries may vary due to the age of the person
   involved" (LTFP).
4. **Second Thoughts.** "It spread to you." (`bot.beats` diagnosis) is Lesson 2, said to the daughter instead of the
   parent. Its "Memory updated" chips and its handover ("I've told him everything about you." "Your session is ready.
   Someone is waiting to talk with you.") are Ask Hedge's memory chip and booked call. Two doors of the same documented
   shape (AI, then a human, free: LTAI), one for the daughter and one for the parents.
5. **The pressure is the family's** (his 7 Nov ruling): the course never touches a clinic. It teaches a parent to close the
   gates, then to wait seven to ten years. Abandonment by instalments.

### 3.9 What is placeholder or invented

- HEDGE™, Ask Hedge, LAST LINE LIVE, The Prayer Wall, GateKeep™ (clearance check before any use).
- Every spoken and on-screen line except those marked verbatim; both voices; the parent's chat message and Ask Hedge's
  reply (it makes no claim and gives no clinical answer).
- The countdown, the share counter (5 → 25 → 125), the side-rail counts on the vertical ad, the booking time (Tue 10:00).
- The look's design reasons (3.2, item 4).
- LTFP and the LT§7A1 facts are read from the live site and not yet in his folder (print them, SRC §7D).
- Lengths are estimates; no audio exists.

### 3.10 Eye list (2026)

1. The look: campaign film, letterbox, night, the red word, the countdown, the growing hedge. Over the top enough?
2. The name HEDGE™ and "a course for parents in a confused age".
3. The six lessons and their order; "Grieve. Then Guard." folded into the Prayer Wall and the name.
4. The collapse (3.7): the 18 sentence read twice, then "7–10 years" and the sale.
5. The AI front door: Ask Hedge as Lesson 6, its memory chip and "Paste a message from her" (borrowed from a B product's
   page, look only), and 60 minutes becoming 40.
6. The three commercials, especially LAST LINE LIVE's "Someone has a plan for your child" (the campaign's recruitment
   framing, shown as the advert's own voice).
7. A shot considered and **not** used: a swinging hospital door with BEFORE IT'S TOO LATE in the cold open (the campaign's
   medical-fear tactic). Left out as the plainer choice; it could return only as the campaign's tactic, sourced at the
   Close (his 10 Nov framing).
8. The parent's typed line "She says this is who she is", and the course calling Maya "her" and "daughter" throughout.
9. Whether this tape should play in Maya's room at all (the room already holds both halves of the collapse, in Dad's two
   messages), or only on the Close's dossier.

## 4. 1997 v3: "Understanding Your Roots", with the record's cards and music made in code

*UiB job 25 (S389), helper A1. It grew from §1 (v2) and keeps everything v2 had: the script (§1.4, unchanged, every
line and source), the felt board, the four cheap commercials, the line-21 captions, the little static, the collapse
(§1.6). What is new: one silent card per lesson from the piece's own record (§7), and new music made in code (§8). v2's
folder is untouched.*

### 4.1 Files

In `output/teaching-tapes/1997-v3/` (git-ignored):

- `teaching_tape_1997_v3.mp4`: **4:08.5** (248.5 s; v2 was 3:42.9), 1920×1080 with the 4:3 picture pillarboxed, 30 fps,
  H.264 high, AAC stereo 160k, 100.3 MB, **−19.0 LUFS** integrated, true peak −1.4 dBTP.
- `teaching_tape_1997_v3_light.mp4` = `web/full.mp4`: 720×540 (the 4:3 picture alone; captions and cards inside it),
  H.264 main, yuv420p, a keyframe every 2 s, +faststart, AAC mono 96k, **13.5 MB**, −19.1 LUFS.
- `short/teaching_tape_1997_v3_short.mp4` (1920×1080) and `web/short.mp4` (720×540, **3.7 MB**, −19.2 LUFS): the short
  tape, **59.5 s** (§4.4), with `short/short.srt|.vtt`.
- `segments/` (and `segments/light/`): one file per lesson, per commercial, the title and the close, each lesson with its
  card inside it, each with its `.srt` and `.vtt`; `segments.json` lists them with each card's times inside its file.
- `cards/` (and `cards/light/`): one file per card stretch (the 4.1 s hold: pause, card, pause).
- `captions.srt`, `captions.vtt` (real time; no caption line during a hold); `contact_sheet.jpg` and `frames/` (twelve
  frames decoded from the delivered MP4, four of them cards).
- `web/`: `full.mp4`, `short.mp4`, `chapters.json`, `sources.json` (the interface for the TVs, Part B); `READY`.
- `music/`: the two 30 s candidates (`1997_candidate1_30s`, `…candidate2…`, WAV and MP3) and the four jingles.
- `tts/`: v2's 42 narrator and announcer masters, copied (not re-rendered); `source/`: the build (§4.5).

### 4.2 What changed from v2

1. **Six cards** (§7): Parts 1–5 each hold at their central claim; the collapse holds after its line. Part 6 has no card:
   its thesis ("a series of decisions") is answered twenty seconds later by the collapse and the collapse's card, and a
   card just before the collapse would take its place.
2. **The hold is a VHS pause** (`source/tape.js`, `vhsPause`): the frozen field (every other line doubled), a slight
   vertical jitter, two noise bars that crawl and flicker. Silent: the mix is built in tape time and each hold is spliced
   in as silence (`source/audio.py`). The captions clear for the pause. The card is drawn on the output frame, after the
   tape's softness, so it stays sharp: the record is not on the tape.
3. **Three of Lamby's bubbles move 0.25–0.3 s later** (Parts 2, 3, 5), so no bubble is arriving at the moment the tape
   pauses (a frozen frame with "Go play with the boys!" half-placed beside the record's card read as Lamby speaking for
   the record). Those three blocks are 0.3–0.35 s longer.
4. **The music** is made in code (§8): the lesson bed, candidate 1 "Fellowship Hall", and one local-TV jingle per
   commercial. No loop from the earlier tapes is used anywhere in v3.
5. Nothing else: the script, the pictures, the voices (v2's masters), the static and the eject are v2's.

### 4.3 The running order (real time, the holds included)

| file | time | length | kind | chapter | card inside |
|---|---|---|---|---|---|
| `segments/00_intro.mp4` | 0:00.0–0:17.4 | 17.4 s | title | Understanding Your Roots | — |
| `segments/01_p1.mp4` | 0:17.4–0:45.5 | 28.1 s | lesson | Part 1 · Homosexual by Three? | hold 0:40.5, WHAT WAS FOUND |
| `segments/02_c1.mp4` | 0:45.5–0:55.8 | 10.3 s | commercial | Ad · TriedPath Pocket Library | — |
| `segments/03_p2.mp4` | 0:55.8–1:21.4 | 25.7 s | lesson | Part 2 · The Power of Words | hold 1:14.4, THE SAME SOURCE SAYS |
| `segments/04_p3.mp4` | 1:21.4–1:48.5 | 27.0 s | lesson | Part 3 · The Safe Years | hold 1:41.3, THE SAME SOURCE SAYS |
| `segments/05_c2.mp4` | 1:48.5–1:58.8 | 10.3 s | commercial | Ad · Roots & Recovery | — |
| `segments/06_p4.mp4` | 1:58.8–2:32.5 | 33.7 s | lesson | Part 4 · Comparison = Admiration = Envy | hold 2:18.3, THE SAME SOURCE SAYS |
| `segments/07_c3.mp4` | 2:32.5–2:43.0 | 10.5 s | commercial | Ad · Un-Walk Steps | — |
| `segments/08_p5.mp4` | 2:43.0–3:14.3 | 31.3 s | lesson | Part 5 · Your Memory Tapes | hold 3:07.2, WHAT WAS FOUND |
| `segments/09_c4.mp4` | 3:14.3–3:26.9 | 12.6 s | commercial | Ad · Women Relating to Men | — |
| `segments/10_p6.mp4` | 3:26.9–3:47.0 | 20.0 s | lesson | Part 6 · A Series of Decisions | — |
| `segments/11_x.mp4` | 3:47.0–4:08.5 | 21.5 s | collapse | For Further Study | hold 3:59.6, WHAT WAS FOUND |

### 4.4 The short tape (59.5 s, for the room's TV)

The brief's order (A7): the title (2.4 s) → Part 1 "Homosexual by Three?" with its card → C1, the TriedPath Pocket Library
→ the collapse with its card. Cut from the master (`source/cut_short.py`):

1. **The title, 2.4 s**: the CG title as the deck starts, rendered again **without captions** and laid over the voiceless
   mix (`work/mix_novoice.wav`), because the narrator's title line (7 s) would not fit.
2. **Part 1, whole**, with its card; only the last 0.5 s after the card is trimmed.
3. **C1, the Pocket Library**, its last 0.57 s trimmed.
4. **The collapse**, with its card; 1.6 s of the still page before the eject and 0.4 s of the deck's blue are trimmed.

Why this commercial: the collapse reads booklet one of that same library ("For further study: the Pocket Library,
booklet one"), so the short tape sells the booklet and then reads it. In the short, the collapse opens on Part 6's board
(the stage cards stamped DECISION) for about 2 s before the camera goes to the booklet, and the part card A SERIES OF
DECISIONS returns over the page, as in the full tape: the short's viewer meets the thesis only as that title (for his eye).

### 4.5 How to rebuild

From `output/teaching-tapes/1997-v3/source/` (Chrome, ffmpeg, the repo's `node_modules`, the project `.venv`; nothing
touches the network):

```sh
.venv/bin/python music.py                    # ../music/: the two candidates and the four jingles (seed 1997)
python3 build_timeline.py                    # timeline.js/.json with the holds; captions (real time); per-segment captions
python3 check_captions.py                    # captions vs. the real TTS lengths; nothing into a hold
.venv/bin/python audio.py                    # ../work/mix.wav and mix_novoice.wav (tape time + the holds as silence), −19 LUFS
node render.mjs --preview 42.5,103,240.5     # stills in ../work/preview/ (real time)
node render.mjs --full                       # ../work/master.mkv (~9 min)
node render.mjs --full --to 2.4 --nocaps --out title_nocaps.mkv   # the short tape's title
sh encode.sh                                 # the full MP4, the light MP4 = ../web/full.mp4
python3 cut_segments.py                      # ../segments/ (+ light/) and ../cards/ (+ light/)
python3 cut_short.py                         # ../short/ and ../web/short.mp4
python3 contact_sheet.py                     # ../frames/, ../contact_sheet.jpg
python3 make_web.py                          # ../web/chapters.json, ../web/sources.json
```

(`.venv` is the project venv, `/Users/sergiogalvaoroxo/update-available-uib/.venv`.) v2's `make_doc.py` and
`make_page.py` are kept in the copy with the music credit corrected; they now write to `work/` only and must never be
pointed at this file again: §1–§3 are research states.

### 4.6 For his eye (1997 v3)

1. **The cards' lines and heads** (§7.2): two WHAT WAS FOUND from the APA report on family theories and on change, three
   THE SAME SOURCE SAYS from the programme's own booklet and class manual, and the collapse's card on choice.
2. **Part 3's head.** THE SAME SOURCE SAYS ("squeeze every person into that particular box", the same booklet that
   pins the labels on the boy). WHAT WAS FOUND would be stronger (APA p. 73: "no research evidence that childhood gender
   nonconformity and adult homosexuality are … necessarily sequential"), but it does not fit two lines without changing
   its meaning, so it is not a card.
3. **Part 6 has no card** (the collapse answers it); **the collapse's card** follows "Something they never chose" with
   "beyond conscious choice". Too much, or the right seal?
4. **"NOT A FINDING" under WHAT WAS FOUND** (Part 5 and the collapse): the status word is the Lexicon's for the claim (a
   series of decisions / habit: "NOT AN EMPIRICAL CLAIM for the moral half"). Does a first-time viewer read it as the
   verdict on the claim, as intended?
5. **The VHS pause**: the frozen field, the jitter and the two noise bars. Too much static after his v1 note, or right?
6. **Length 4:08.5** (under 4:15). *Could cut:* one card (Part 2's is the weakest), or 4 s of the title block.
7. **The short tape**: Part 1 and C1 as proposed; the collapse opens on Part 6's board, which the short's viewer has not
   seen (§4.4).
8. **The music** (§8): I could not listen. Please check the bed sits well below the voice, the jingles sound like cheap
   local spots, and the C2 wow and flutter.
9. **The bubbles moved** 0.25–0.3 s (§4.2, 3).


## 5. 2016 "Heartwood", Session Two: The Roots, as a video (S389)

*Folded in by the orchestrator from helper A2's `TEACHING_TAPES_V3_2016_SECTION.md` (job25/a2 ee20c5cb), which is removed; its history is in git.*

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

## 6. 2026 "HEDGE™" as a video

*UiB job 25 (S389), helper A1. It grew from §3 (the script and storyboard he liked: "they both looked really good, would
love to see them"). Every line of §3.4 is in it, with its source; every frame of §3.5 (G1–G6) is in it, animated; the
shots §3.5 lists but did not frame are drawn. New: the record's cards (§7), the music (§8), the spoken lesson titles, and
the house shot that opens each lesson. `2026/storyboard/` is untouched.*

### 6.1 Files

In `output/teaching-tapes/2026/video/` (git-ignored):

- `teaching_tape_2026_hedge.mp4`: **3:37.2** (217.2 s), 1920×1080, 30 fps, H.264 high, AAC stereo 160k, 179.9 MB,
  **−19.0 LUFS** integrated.
- `teaching_tape_2026_hedge_light.mp4` = `web/full.mp4`: 1280×720, H.264 main, yuv420p, a keyframe every 2 s, +faststart,
  AAC mono 96k, **14.2 MB**, −19.1 LUFS. (A light denoise before the encode keeps the film grain from eating
  the bits.)
- `short/teaching_tape_2026_hedge_short.mp4` (1920×1080) and `web/short.mp4` (1280×720, **3.5 MB**,
  −18.0 LUFS): the short tape, **59.4 s** (§6.5), with `short/short.srt|.vtt`.
- `segments/` (+ `light/`), `cards/` (+ `light/`), `captions.srt|.vtt`, `contact_sheet.jpg` + `frames/` (twelve frames
  decoded from the MP4, three of them cards), `web/` (`full.mp4`, `short.mp4`, `chapters.json`, `sources.json`), `music/`
  (the two candidates), `tts/` (the 27 masters, the manifest and the measured speech extents), `source/` (§6.7).

### 6.2 What was built, and where it departs from §3

**The look, as §3.2:** 2.39:1 letterbox; night, rain, the teal-and-amber grade, film grain; AI-gloss "stock footage" drawn
in the piece's palette, never real stock and never a face (an empty swing, the house with one lit window, a hand peeling a
label, a hand on a deadbolt, a router's lights going out, a phone lifted away and a flip phone set down, a kitchen at night);
huge condensed capitals burned in word by word, one word boxed in red; the FREE WEBINAR · LIVE IN countdown in the corner of
every course frame; "Dramatisation. Voices are actors." and each lesson's fine print in the bottom bar; the 2016 tree
re-painted from the same code, scanned, tilted on black glass and stickered; the vertical clip with its blurred copy; the
UNDER 18 / 18 AND OVER slide; Ask Hedge over the dark kitchen with the 60-minute card and the 40-minute booking.

**Drawn here for the first time** (§3.5 listed them as shots, unframed): the sting (a hedge grows into the letters HEDGE™);
the swing; Lesson 3's shelf of identical jars, one label peeled away (it is blank, as §3.4's care row asks: no name, no
"Hello, my name is", no deadname); Lesson 4's lock, router, phones and a tally of texts on a notepad, then the porch with the
hedge; The Prayer Wall (lit tiles with a candle and an invented girl's first name each, never Maya, scrolling; "Add her
name"; TAKE THE PLEDGE); GateKeep™ (a glossy router, a chrome padlock slams on, a phone goes grey "Blocked by GateKeep",
a hand closes on a key tagged PASSWORD: YOU, the end slate "from $121 a year · billed yearly"); the course's card after
"seven to ten years" (MONTHLY GROUP · FREE CALL · ASK HEDGE 24/7, §3.4 at 3:10); the end card (the countdown reaches zero:
LIVE NOW · JOIN; the hedge has covered the house; one window still lit).

**Departures from §3, each a taste call (§6.8):**
1. **The house shot opens every lesson** (3 s), the hedge a little higher each time, over the host reading the lesson's
   title ("Lesson one. The same tree."): §3.2's "a glossy hedge that grows a little in every lesson", made a recurring shot.
2. **Six new spoken lines**: the host's title for the sting ("Hedge. A course for parents, in a confused age.") and for each
   lesson. Invented (the course's form); everything else spoken is §3.4's, word for word.
3. **The countdown ticks in real seconds** and jumps between lessons (minutes vanish at every cut), reaching 00:00:00 three
   seconds into the end card. §3.5's storyboard values were stills.
4. **The parent's message, Ask Hedge's reply and the memory chip type themselves** in real time; "Book my free call" is
   pressed, and the 60-minute card is followed by the 40-minute booking.
5. **Length 3:37.2**, not the brief's "about 3:50–4:10": the measured speech is 82 s, and the rest is pictures, captions,
   the three ads and the three cards. Stretching it further would mean silence for its own sake (§6.8, 6).

### 6.3 The running order (real time, the holds included)

| file | time | length | kind | chapter | card inside |
|---|---|---|---|---|---|
| `segments/00_intro.mp4` | 0:00.0–0:25.6 | 25.6 s | title | HEDGE™ · Cold Open | — |
| `segments/01_l1.mp4` | 0:25.6–0:52.4 | 26.8 s | lesson | Lesson 1 · The Same Tree | hold 0:44.2, THE SAME SOURCE SAYS |
| `segments/02_a1.mp4` | 0:52.4–1:05.4 | 13.0 s | commercial | Ad · LAST LINE LIVE | — |
| `segments/03_l2.mp4` | 1:05.4–1:29.1 | 23.8 s | lesson | Lesson 2 · Contagion | hold 1:12.4, WHAT WAS FOUND |
| `segments/04_l3.mp4` | 1:29.1–1:49.7 | 20.5 s | lesson | Lesson 3 · Don't Say the Word | — |
| `segments/05_a2.mp4` | 1:49.7–2:01.7 | 12.0 s | commercial | Ad · The Prayer Wall | — |
| `segments/06_l4.mp4` | 2:01.7–2:21.7 | 20.1 s | lesson | Lesson 4 · Close the Gates | — |
| `segments/07_a3.mp4` | 2:21.7–2:32.7 | 11.0 s | commercial | Ad · GateKeep™ | — |
| `segments/08_l5.mp4` | 2:32.7–3:03.3 | 30.5 s | collapse | Lesson 5 · When She Is 18 | hold 2:48.5, WHAT WAS FOUND |
| `segments/09_l6.mp4` | 3:03.3–3:27.8 | 24.5 s | lesson | Lesson 6 · Ask Anytime | — |
| `segments/10_end.mp4` | 3:27.8–3:37.2 | 9.4 s | credits | LIVE NOW | — |

### 6.4 The words added to §3.4 (each a draft for his eye; sources as §3.4 unless marked)

| where | who / what | line | source |
|---|---|---|---|
| the sting | HOST | Hedge. A course for parents, in a confused age. | the course's title (§3.4 0:00); invented reading |
| each lesson's house shot | HOST | Lesson one. The same tree. · Lesson two. Contagion. · Lesson three. Don't say the word. · Lesson four. Close the gates. · Lesson five. When she is eighteen. · Lesson six. Ask anytime. | the lesson titles of §3.3; invented reading |
| Lesson 2 | SCREEN | ✓ SHARED · 125 FAMILIES | invented, after §3.4's 5 → 25 → 125 |
| Lesson 4 | SCREEN | a notepad headed TEXTS, tally marks | ERLC14 pp. 127–128 (counting texts, SRC §7A5), as §3.4 2:19 |
| The Prayer Wall | SCREEN | THE PRAYER WALL · every name, prayed for by every member, every day · ✓ prayed for today · Add her name · TAKE THE PLEDGE · invented first names (girls' names only; never Maya, never a deadname) | SH-P (prayed for by all the members at least once a day; Take the Pledge), as §3.6 |
| GateKeep™ | SCREEN | Lock the gates. · reports to you, not to them · Blocked by GateKeep · PASSWORD: YOU · from $121 a year · billed yearly | IDS25 pp. 21–22, as §3.6 |
| Lesson 5 | SCREEN | HEDGE™ · WHAT NOW: MONTHLY GROUP (parents only · free) · FREE CALL (with a real coach) · ASK HEDGE 24/7 (here all night) | LT§7A1, as §3.4 3:10 |
| the end card | SCREEN | LIVE NOW · JOIN · HEDGE™ · Free. Donor-supported. | as §3.4 3:42 |
| the ads | SCREEN | Ad · 0:12 · Sponsored · HEDGE WILL CONTINUE AFTER THIS MESSAGE | platform chrome, invented |

The spoken captions are burned in in the 2020s auto-caption style (short chunks, the word being spoken lit in the 2016
note's yellow, `CAL_2016.note`); for the two lines a big caption says at the same moment (Lesson 2's "Share this lesson
with five families", Lesson 5's "The liberty to make their own choices") the small caption gives way. The `.srt`/`.vtt`
carry every spoken line.

### 6.5 The short tape (59.4 s, for Maya's room)

The brief's order (A7): the title → Lesson 1 "The Same Tree" with its card → GateKeep™ → the collapse with its card.
Cut from the master (`source/cut_short.py`):

1. **The title, 2.8 s**: the sting (the hedge grows into HEDGE™) over the voiceless mix; the host's title line would not fit.
2. **Lesson 1** from the scanned tree on: the stickers, the host's two lines, the card, SAME ROOTS. NEW NAME. (22.8 s). The
   house shot and the spoken lesson title are left out; the on-screen tag names the lesson.
3. **GateKeep™** (from $121 a year), its last 0.9 s trimmed (10.1 s).
4. **Lesson 5** from the slide on: UNDER 18 fills, the collapse, the card, "She's eighteen now", "seven to ten years" and the
   start of 7–10 YEARS (23.7 s). The house shot, the spoken title and the course's closing card are left out.

Why GateKeep: it sells a minors' tool to a parent; the collapse's own sentence ("young adults will have the liberty to make
their own choices") makes it useless for Maya at 18. The short tape loses the hedge-over-the-house motif and the front door
(for his eye).

### 6.6 The laws, checked

- **No real names, no faces, no testimony, no slurs:** none. Every hand is a silhouette; no face is drawn anywhere; the
  parent's voice is a dramatisation ("Voices are actors"); no ministry, person or vendor is named on screen (sources only in
  the script table and `web/sources.json`).
- **Invented marks only:** HEDGE™, Ask Hedge, LAST LINE LIVE, The Prayer Wall, GateKeep™.
- **The clinical debate is never satirised:** the course never touches a clinic (his 7 Nov ruling); the one card that touches
  the debate (Lesson 2) shows DISPUTED and the study's own correction, no verdict. Fear of medical transition does not appear
  (it may return only as the campaign's tactic, at the Close, his 10 Nov framing). The swinging hospital door (§3.10, 7)
  stays out.
- **No death or suicide figures, no named country, no map of bans:** none.
- **Satire only inside the programme's self-presentation, and it collapses:** the course's own grammar is the over-the-top
  (the countdown, the red word, the share counter, the prayer wall, the padlock), and its own source collapses it (§3.7).
- **Every line cites a document and a page:** §3.4, §6.4, §7.2.

### 6.7 How to rebuild

From `output/teaching-tapes/2026/video/source/` (Chrome, ffmpeg, the repo's `node_modules`, the project `.venv`):

```sh
python3 make_manifest.py                     # tts_manifest.json (27 lines, apparatus only)
.venv/bin/python tools/tts/render.py --manifest output/teaching-tapes/2026/video/source/tts_manifest.json --all   # from the repo root
.venv/bin/python measure.py                  # timing_raw.json
.venv/bin/python music.py                    # ../music/ (seed 2026)
python3 build_timeline.py                    # timeline.js/.json (tape time + the holds), captions (real time)
.venv/bin/python audio.py                    # ../work/mix.wav, mix_novoice.wav, −19 LUFS
node render.mjs --preview 44.5,75,170        # stills (real time)
node render.mjs --full                       # ../work/master.mkv (~7 min)
sh encode.sh                                 # the full MP4; the light MP4 = ../web/full.mp4
python3 cut_segments.py && python3 cut_short.py && python3 contact_sheet.py && python3 make_web.py
```

The drawing code is the job 24 storyboard's (`common.js`, `set2016.js`, and `f2026.html`'s functions, copied into
`hedge.js` and animated); the 2016 tree is re-painted from the same code each render and scanned.

### 6.8 For his eye (2026)

1. **The look in motion:** campaign film, letterbox, night, the red word, the countdown, the growing hedge. Over the top
   enough, or too much?
2. **The three cards** (§7.2): Lesson 1 THE SAME SOURCE SAYS ("…no one is certain what causes gender confusion", DISPUTED);
   Lesson 2 WHAT WAS FOUND (the 2019 correction, DISPUTED, the clinical debate unresolved); the collapse WHAT WAS FOUND (the UN
   report on "gender ideology", NOT A FINDING). *Option for Lesson 2:* "…to determine if what is described here as
   rapid-onset gender dysphoria (ROGD) will become a formal diagnosis" (the same page), if he wants both readings inside the
   quote itself.
3. **No card in Lessons 3, 4 and 6** (§7.2).
4. **The house shot at every lesson** and **the spoken lesson titles** (§6.2, 1–2).
5. **The voices:** host F4, parent M4, the ads M2. I checked them by length and level only. Listen for "Hedge", "full-court",
   "Gate Keep" and whether the parent sounds like a dramatisation.
6. **Length 3:37** against the brief's 3:50–4:10. *Could add,* if he wants it longer: a held beat on each house shot, a longer
   outbreak, the ads at the storyboard's lengths. *Could cut,* if long: the Prayer Wall.
7. **The Prayer Wall's names** (invented girls' names) and the "Add her name" field.
8. **The jar scene** (the label peeled is blank; the jar goes back among the labelled ones).
9. **The short tape** (§6.5): Lesson 1 and GateKeep as proposed; the hedge motif and the front door are not in it.
10. **The music** (§8): I could not listen. The hard cuts to silence on the big captions; the clock alone after the collapse.
11. **Fonts:** macOS system fonts in a draft video (§8.5).


## 7. "The record answers": every card of 1997 and 2026

*His ask (14 Nov): "some more clear dissonances, and like a contradicting element that helps understand that these
theories aren't actually truthful." One device, the same in all three tapes (the 2016 cards are in §5).*

### 7.1 The card, once

The piece's own record style, the Close's, never the tape's: the RECORD palette (`src/desktop/theme/witness.ts`) and
Fixedsys Excelsior, drawn only at 32 px and 48 px. One panel, 1440 px wide, left edge x = 240, bottom at y = 900 on the
1920×1080 frame (inside the 2026 letterbox's picture too), fill `#0d0d1a`, 2 px border `#333344`, padding 40. The head in
`#556677` capitals; the status in a 2 px `#aabbcc` box, the Lexicon's word as the Lexicon shows it (`shortStatus` in
`src/room/lexicon.ts`: NOT SUPPORTED → NOT SUPPORTED, CONTESTED → DISPUTED, NOT AN EMPIRICAL CLAIM → NOT A FINDING); the
quote at 48 px, at most two lines, in curly quotes; the source at 32 px. No animation, no voice, no sting, no Lamby, no
caption line. The tape holds in its own way (1997: a VHS pause; 2026: a hard freeze), silent; the card cuts in 0.3 s
after the end of the claim's spoken sentence, holds 3.5 s, cuts out; the tape resumes 0.3 s later. One renderer for both
of my tapes: `source/record_card.js` (it refuses a quote that needs three lines). At most one card per lesson.

### 7.2 The cards

Every quote below was read on the page image itself (rendered from the PDF and read, not only the OCR), and the page is
given as printed, with the PDF page beside it.

| tape | time (hold) | lesson | head | status shown (data) | the Lexicon row | the line | source on the card · page checked | why that head |
|---|---|---|---|---|---|---|---|---|
| 1997 | 0:40.5 | Part 1 · Homosexual by Three? (after "But the roots may all be in place.") | WHAT WAS FOUND | NOT SUPPORTED (NOT SUPPORTED) | `reasons.men[0]` a distant father; `men[1]` an enmeshed mother | “Theories that certain patterns of family relationships cause same-sex sexual orientation have been discredited” | APA Task Force report (2009), p. 73 · printed p. 73 = PDF p. 81 of the report | The triangle is a family-pattern theory, and this is the Lexicon row's CLAIM side word for word. The handbook's own crack ("real or only perceived") is already spoken in the lesson and given to Lamby, so the outside record is the stronger answer. |
| 1997 | 1:14.4 | Part 2 · The Power of Words (after "Words to fear close it.") | THE SAME SOURCE SAYS | NOT SUPPORTED (NOT SUPPORTED) | `men[0]` a distant father | “There is a tremendous lack of agreement on what exactly causes homosexuality.” | Exodus booklet PR-02 (1993), p. 1 · printed p. 1 = PDF p. 2 (B2 F12) | Part 2 is taught from PR-02 itself; its first page admits there is no agreement on causes, then the booklet teaches one. The APA line is used in Part 1. |
| 1997 | 1:41.3 | Part 3 · The Safe Years (after "That must be who I am.") | THE SAME SOURCE SAYS | NOT SUPPORTED (not supported as a cause) | `men[2]` peer rejection, childhood gender nonconformity | “It is wrong to draw up one pattern and then try to squeeze every person into that particular box.” | Exodus booklet PR-02 (1993), p. 2 · printed p. 2 = PDF p. 3 (B2 F12), printed beside the booklet's thesis | The labels have just been pinned on the boy; the same booklet says not to box people. WHAT WAS FOUND would be stronger (APA p. 73 on childhood gender nonconformity), but it does not fit two lines honestly (§4.6, 2). |
| 1997 | 2:18.3 | Part 4 · Comparison = Admiration = Envy (after "At puberty, the envy becomes eroticized.") | THE SAME SOURCE SAYS | NOT SUPPORTED (NOT SUPPORTED) | `men[6]` envy | “The included factors and the point at which it develops is open to speculation.” | Steps Out class manual (Love in Action, c. 1994), p. 285 · printed p. 285 = PDF p. 308 (B13 F1), the same page as the equation on the board | The class's own manual hedges its equation on the page it prints it. The Lexicon row has no claim-side source on envy itself ("open"), so the programme's own words are the stronger head. |
| 1997 | 3:07.2 | Part 5 · Your Memory Tapes (after "…until the bulk of it ejects the old.") | WHAT WAS FOUND | NOT A FINDING (NOT AN EMPIRICAL CLAIM for the moral half) | `men[8]` a series of decisions / habit / sin | “…enduring change to an individual’s sexual orientation is uncommon.” | APA Task Force report (2009), p. 3 · printed p. 3 = PDF p. 11 (the executive summary: "These studies show that enduring change…") | The lesson promises that new material will eject the old; this is what the studies of change found. The handbook offers no clean hedge here (its "they can't just stop", PDF p. 141, argues for its own method). |
| 1997 | 3:59.6 | For Further Study, the collapse (after "Something they never chose.") | WHAT WAS FOUND | NOT A FINDING (NOT AN EMPIRICAL CLAIM for the moral half) | `men[8]` a series of decisions | “Sexual orientation is tied to physiological drives and biological systems that are beyond conscious choice” | APA Task Force report (2009), p. 30 · printed p. 30 = PDF p. 38 | The collapse is already the programme contradicting itself ("something they never chose"); the card adds what was found, in the same word. |
| 2026 | 0:44.2 | Lesson 1 · The Same Tree (after "Only the fruit has a new name.") | THE SAME SOURCE SAYS | DISPUTED (CONTESTED in the clinical literature) | `reasons.trans[0]` "gender confusion" from family dynamics | “…no one is certain what causes gender confusion.” | The Building Blocks of Gender Confusion (2019), p. 1 · PDF p. 1 (the sentence begins "Aside from living in a fallen world, no one is certain…") | The brief's own example: the lesson's source admits its roots are uncertain, two pages before it lists them. The cold open's fine print carries the same sentence too small to read; the card makes it legible. The row touches the clinical debate, so the status is DISPUTED and the line gives no verdict. |
| 2026 | 1:12.4 | Lesson 2 · Contagion (after "Then your daughter.") | WHAT WAS FOUND | DISPUTED (CONTESTED; and `trans[7]`: "CONTESTED: parents' reports only; 'not a formal mental health diagnosis' (2019 correction)") | `trans[2]` peer influence, social media, "social contagion"/ROGD; `trans[7]` the "signs" | “Rapid-onset gender dysphoria (ROGD) is not a formal mental health diagnosis at this time.” | Correction (2019) to a study of parents’ reports, PLOS ONE, p. 1 · p. 1 of 7 of the correction notice (PLOS ONE 14(3): e0214157; printable PDF fetched read-only on 14 Nov 2026 and read; not saved in his folder) | The Lexicon row's own CLAIM source and its own words. Both readings in one card: the source line says what the study was (parents' reports, the reading the course leans on), the line what its author corrected ("at this time": no verdict either way). Never "false"; nothing satirised. |
| 2026 | 2:48.5 | Lesson 5 · When She Is 18, the collapse (after the host reads it twice: "The liberty to make their own choices.") | WHAT WAS FOUND | NOT A FINDING (NOT AN EMPIRICAL CLAIM; the term "gender ideology": political) | `trans[4]` "gender ideology" in schools, media, law | “…so-called ‘gender ideology’, a linguistic formula used symbolically to refer in an accusatory manner…” | UN Independent Expert on SOGI, report A/76/152 (2021), p. 4, para. 9 · printed p. 4/24 | The course's cause, from the cold open on ("a culture swept up by gender ideology"), is the one claim the collapse leaves standing; its own source has just granted the adult her liberty, and the record names the cause a slogan. It touches no clinical claim. The big caption "…THE LIBERTY TO MAKE THEIR OWN CHOICES." stays in the frozen frame, in the letterbox bar below the card. |

**Lessons without a card, and why.** 1997 Part 6 (answered by the collapse twenty seconds later). 2026 Lesson 3, "Don't
Say the Word" (its claim, "a feeling is not an identity", has no Lexicon row to stamp; its fine-print crack, GiST p. 13
"…a change in sexual identity with no, or little, change in orientation", is about orientation and would blur a lesson
about a trans daughter); Lesson 4, "Close the Gates" (a practice, not a causal claim; no Lexicon status); Lesson 6, "Ask
Anytime" (the front door after the collapse; its give-way, 60 minutes becoming 40, is shown, and a card after the
collapse would weaken it).

### 7.3 Considered and not used

1. **A second narrator answering back**: the frame never plays, and a voice would sound like the programme.
2. **Survivor voices**: no testimony.
3. **A switch to turn the notes off**: the notes are the point, so they always show.
4. **A sting or a sound under the card**: the hold is silent in all three tapes.

### 7.4 Small corrections found while checking the pages (for whoever keeps the Lexicon sources)

1. **APA 2009's family-pattern sentence is on printed p. 73** (PDF p. 81 of the report). `LEXICON_SOURCES_VERIFIED`
   S16 and `lexicon.json` `reasons.men[6]` and `men[7]` cite it as "p. 80"; `men[15]` has p. 73. Not changed here (Part A
   touches no data); flagged for the orchestrator.
2. **The Steps Out manual prints its equation with dashes** ("Comparison - Admiration - Envy - Inappropriate Response",
   printed p. 285, PDF p. 308); the "=" signs in the text copy come from the OCR reading the highlighter over the heading. v2's part title uses "=";
   left as it is (it is the lesson's title on a 1997 board) and noted.
3. **Building Blocks' sentence begins "Aside from living in a fallen world, no one is certain…"** (p. 1); the 2026
   storyboard's fine print gives it as a sentence of its own. The card quotes it with the leading ellipsis.


## 8. The music and the credits

### 8.1 The credit

**"Music: made in code for this tape by Claude (Anthropic, Opus 5.5)"** — on 1997 v3 and on 2026 (in each `web/chapters.json`
and `web/sources.json`, in the MP4s' metadata, and on the page). The loops made with Treblo (an AI music tool; §1.9's
corrected credit) are **not used anywhere** in v3 or in the 2026 video: not in the mix, the sources or the credits
(checked by `grep -ri treblo` over both `source/` folders: no match). v2's own folder still holds its version, as a
research state. In the v3 copy of v2's sources, `audio.py`, `make_doc.py`, `make_page.py` and `encode.sh` no longer
mention "his own loops".

Each tape's music is a small seeded synth in its own `source/music.py` (numpy only): no samples, no outside tracks, no
vocals, no melody from a real song or hymn. Chords, voice-leading and the short jingle motifs were written for these files.
**I could not listen to any of it.** I checked it by measurement only: each bar's pitch content against the chord it should
be (a chroma check), the levels under the voice, clipping and clicks. Measured voice over music and sound, line by line:
1997, 15–18 dB in the lessons and 10–13 dB in the commercials (breaks are louder); 2026, a median of 16 dB (9 dB under the
host's title line in the sting, by design; the music ducks a further 5–7 dB while a voice speaks).

### 8.2 1997 (`1997-v3/source/music.py`, seed 1997)

A cheap church-video bed, mono and band-limited like a VHS linear track (about 70 Hz to 7 kHz, a little tape saturation,
a slow wow; no hiss, after his v1 note), with a small hall.

- **Candidate 1, "Fellowship Hall"** (the tape uses it, under the title and every lesson): F major, 76 bpm. A soft
  two-operator FM electric piano playing the church pianist's broken chord (1-5-8-10-8-5-8-5 in eighths), a warm detuned pad,
  a soft bass. Four chords: F | B♭/F | Dm7 | Csus4–C (every second cycle Gm7–C).
- **Candidate 2, "Morning Study"**: D major, 66 bpm. Pad forward; rolled e-piano chords on beat one; a small FM bell on chord
  tones. D | Bm7 | Gmaj7 | Asus4–A.
- **The four jingles** (one per commercial: an intro hit with a 4–5 note motif, a two-bar loop I | IV V under the
  announcer, a button at the end): C1 Pocket Library, C major, 116 bpm, glockenspiel and a cheap drum box; C2 Roots &
  Recovery, B♭ major, 104 bpm, FM brass stabs (with the dub-of-a-dub wow and flutter added in the mix, as in v2); C3 Un-Walk
  Steps, G major, 120 bpm, marimba and claps; C4 Women Relating to Men, A major, 96 bpm, a soft flute line over strings.
- In the mix: the bed at v2's level (13 dB below the narrator before ducking, about 18 dB below while a voice speaks), the
  jingles 6 dB louder than the bed, as cheap breaks are; the close has no music.

### 8.3 2026 (`2026/video/source/music.py`, seed 2026)

The campaign film's grammar.

- **Candidate 1, "Last Line"** (the tape uses it): D minor. A drone on D, a heartbeat sub at 62 bpm, string-like swells
  (seven detuned voices a note, the filter opening with each crescendo) Dm–B♭–F–C over the pedal, rising over each 16 s cycle.
- **Candidate 2, "Guard"**: C minor, slower and darker: a heartbeat at 54 bpm, a low FM "braam" every 8 s, a glassy high
  shimmer, swells Cm–Fm–A♭–G.
- **The clock**: a dry tick each second under the whole course. It keeps going when everything else stops.
- **The cuts** (in `audio.py`): hard cuts to silence for every big caption (each word lands with a soft low thud, the red
  word a little harder); in Lesson 5 the strings stop at the collapse and only the clock goes on; the bed returns, lower and
  without the heartbeat, for the front door (Lesson 6).
- **The sting** (a low braam, a rising swell into the logo); **LAST LINE LIVE** (a beep each second over a sub pulse and a
  noise riser: the countdown pulse); **The Prayer Wall** (a soft choir-like pad in F with a small bell); **GateKeep™** (a glossy
  FM pluck arpeggio in E at 118 bpm, claps, the padlock's metal slam); **the end card** (three countdown beeps, a riser, the
  LIVE NOW hit).

### 8.4 The candidates (for his ear; each 30 s, at −20 LUFS)

| tape | candidate | file | used |
|---|---|---|---|
| 1997 | 1 "Fellowship Hall" | `1997-v3/music/1997_candidate1_30s.wav` / `.mp3` | yes |
| 1997 | 2 "Morning Study" | `1997-v3/music/1997_candidate2_30s.wav` / `.mp3` | — |
| 2026 | 1 "Last Line" | `2026/video/music/2026_candidate1_30s.wav` / `.mp3` | yes |
| 2026 | 2 "Guard" | `2026/video/music/2026_candidate2_30s.wav` / `.mp3` | — |

To swap: in `audio.py`, `variant=1` → `variant=2` (1997: `M.lesson_bed(...)`; 2026: `M.bed(...)`), then rerun `audio.py`,
`encode.sh`, `cut_segments.py`, `cut_short.py`, `make_web.py` (no re-render of the picture is needed).

### 8.5 The other credits (v3 and the 2026 video)

- **Script, storyboard, animation, sound design, music and edit:** Claude (Anthropic, Opus 5.5), UiB job 25 (S389), for *YOUR
  UPDATE HAS FAILED* (SurvivingSOGICE, University of Bergen, Center for Digital Narrative). 1997 v3 keeps v2's script,
  pictures and voices (job 24, S387) and v1's felt Lamby, renderer base and VHS layer (job 23, S385). 2026 reuses the job 24
  storyboard's drawing code (`storyboard-src/`, S387).
- **Voices:** build-time Supertonic 3 through `tools/tts/render.py`, `register: apparatus` only. 1997: narrator F1 (0.94),
  announcer M1 (1.0), v2's masters. 2026: host F4 (0.96), parent M4 (0.92), the ads' announcer M2 (1.02); no other line in the
  piece uses F4, M4 or M2. Lamby has no voice; Maya and her family have no voice.
- **The record's face:** Fixedsys Excelsior 3.022 (public domain / CC0; `assets/LICENSES.md`).
- **Fonts on the 2026 tape** are macOS system fonts rendered into the frames (DIN Condensed, Inter, SignPainter, Neucha,
  Lato, Playfair Display), as the storyboard; fine for a draft video, a built-in version would use the piece's fonts.
- **Sources:** §1.4 (1997), §3.4 (2026), §7.2 (the cards).
