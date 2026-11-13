STATUS: live

# The 1997 orientation tape, as a video only (13 Nov 2026, S385, UiB job 23)

*A draft for Sérgio to watch before anything is built into the piece. Nothing in `src/`, `data/` or `public/`
changed. Every line of display text is a draft for his eye. Brief: `UIB_JOB_23_2026-11-13.md`. Why the tape:
`INTAKE_CRITIQUE_2026-11-13.md`.*

**Files** (in `output/orientation-tape/`, not in git):

- `orientation_tape_1997.mp4`: 74.0 s, 1920×1080 with the 4:3 picture pillarboxed, 30 fps, H.264 (yuv420p,
  faststart) and AAC stereo, 10.8 MB.
- `contact_sheet.jpg` (12 frames, decoded from the MP4) and `frames/` (the same 12 frames, full size).
- `captions.srt`, `captions.vtt`: every spoken line, every bubble line, the sound cues. They are also burned in.
- `tts/`: the narrator's eight WAV masters and their manifest.
- `source/`: the animation and the build (see "How to rebuild").
- `page/index.html`: the video, the contact sheet and this script, for review.

## 1. What it is

**TriedPath Fellowship · Orientation · Tape 1 of 3: Your First Steps.** A church media ministry's tape for someone
already enrolled. It does not sell. It explains the procedure, slowly and kindly. The process is the one the 1997
corner already holds: your answers become a file, a cause is handed to you, a mentor reads your journal, your family is
called, a summer placement gets a date. Your consent comes last and changes nothing.

**The look: a filmed flannelgraph.** The Sunday-school felt board, filmed by a camcorder on a tripod in a church
hall. Felt pieces are placed one at a time along a felt path with five numbered stones. Around the board, the plain AV
grammar of the period: a character-generator (CG) title on blue, a CG step card for each step, a CG form at the end,
and closed captions in the line-21 style of the 1990s, in white capitals on black boxes. The VHS layer is light:
softness, a little colour bleed, the head-switching band at the bottom edge, one rolling tracking band at the start,
and the eject at the end. [VERIFY SOURCE] for the period claims in this paragraph: felt boards in Sunday-school
teaching, line-21 decoders in US televisions from 1993. They are design reasons, not dossier claims.

**How it differs from the opening advert** ("LambyOS — Welcome Home"; frames pulled and compared):

| | The advert (93 s) | This tape (74 s) |
|---|---|---|
| Genre | an infomercial: it sells | an instructional tape: it explains, to someone already in |
| Picture | sunbursts, star wipes, spinning pedestals, chunky 3D type, saturated gradients | one felt board, still camera, slow zooms, flat CG on navy |
| Pace | fast cuts, a product parade | one piece placed at a time, five numbered steps |
| Lamby | a 3D-ish mascot on a pedestal | a felt cut-out on the board, moved by an unseen hand |
| Voice | narrator M3, upbeat | the fellowship's voice, F1, slow (the same voice as 1997's tape A) |
| Captions | sentence case on a dark bar | line-21 capitals on black boxes, 32 characters a row |
| Ending | the tape chews; the noise spells SOLD AS CARE! | the tape thanks you, then ejects to plain snow. Nothing gathers |

**Lamby** is a felt version of the piece's own drawing (`src/desktop/apps/lambyChar.ts`): the fleece of circles, the
beige face patch, the hanging ears, the topknot, the paperclip loop behind him, and the arm that points (left in step
2, as `pointLeft` does). He has no voice. He speaks in felt bubbles. **People** are faceless felt silhouettes with a
paper name tag: YOU (Daniel's shirt blue, `FOOTAGE.danielShirt`) and MENTOR (brown). The family is a felt house.

**Colour.** Every fill is a token from `src/desktop/theme/` (ERA1, BOARD, PAPER, INK, POSTIT, PIN, SCRAP, PRINT,
FOOTAGE, CAL_1997; the list with sources is at the top of `source/tape.js`). The felt fibre, the shadows and the tape's
softness are those colours darkened or lightened at low alpha. No new swatch.

## 2. The script, with sources

*N = the narrator (spoken, captioned). L = Lamby's bubble (silent, captioned). CG = character-generator text.*

| time | who | line | source, and what is invented |
|---|---|---|---|
| 0:01 | CG | TriedPath Fellowship / ORIENTATION / Tape 1 of 3: Your First Steps | Invented marks (CLAUDE.md; TriedPath Fellowship is 1997 canon, `s1_kit.json`). "Tape 1 of 3" is invented. Programmes did send families teaching material: Love in Action's Parental Reference Form offers "many informative books and pieces of literature" and the newsletter *Lifelines* (LIA booklet, 2001, below). |
| 0:01 | CG | For enrolled participants. Please watch with a parent or guardian. | Invented line. Parallel: LIA's youth programme required the teenager to come "with a Parent or legal Guardian" (booklet, *The Source Program Application* p. 3). |
| 0:01 | N | TriedPath Fellowship. Orientation. Tape one: Your First Steps. | Reads the title. |
| 0:09 | L | Hi! I'm Lamby! | Invented. Lamby is the host (his ruling, 13 Nov). |
| 0:09 | N | Welcome. You have already taken the first step. Lamby will show you the next five. | Paraphrase of LIA's application, p. 1: "It is not an accident that you have this application. You are now taking the first step in your road to recovery." **Documentary** (origin_intake_e1 source 7). |
| 0:15 | N | Step one. Your answers. Every journey starts with honest answers. | Paraphrase of LIA's application, p. 4: "Please answer each question as honestly as possible. We want an accurate assessment of you…". The questionnaire that files answers as a case: Dossier `profile`, **documentary** (origin_intake_e1 source 0, van den Aardweg's Anamnestic Questionnaire). |
| 0:16 | board | SAMPLE INTAKE: [moon] → activity: after hours · I like music → audio profile: building · I keep a diary → self-monitoring: enabled | The filings are the piece's own (`opening.json` `recaptions`). **Example answers:** moon and music are the guided walk's (its record reads "activity: after hours, audio profile: building", TEXT_CENSUS 3 Nov); the diary is the brief's example. In the piece they will be the visitor's own. |
| 0:21 | L | Thanks for sharing! | Invented. |
| 0:24 | N | Step two. The root. Every struggle has a root, and we will help you find yours. | Lexicon "root causes" (#8): USE People Can Change, *Root Problems* (2005); Exodus FAQ (2003): "a pretty uniform picture of poor family dynamics". CLAIM: APA 2009, family-pattern theories "discredited". **Not supported.** "The struggle": Lexicon #3 (Love in Action's "strugglers", 2005). |
| 0:25 | board | root tags: father hunger · mother enmeshment · peer rejection | Verbatim from People Can Change's own list: "father hunger, mother enmeshment, peer rejection, poor gender esteem" (Lexicon source S02; Reasons #28–30, all **not supported** as causes). An organisation's terms, not survivor testimony. |
| 0:28 | board | the "father hunger" tag is taken off the root and pinned on YOU | The cause is handed to him. In 1997 Daniel's form "arrives with questions about his father" (`era_sites.json`). Documented: LIA's application rates "relationships with male authority figures" from appreciative to fearful (p. 6). Its Parental Reference Form asks each parent to complete "I believe that some of the major issues which contributed to my son's/daughter's sexual immorality could be:". Conley's genogram, the "H" beside his name (Insider 2025, 11:36). |
| 0:29 | L | Found it! | Invented. It is the satire: nothing was found; a cause was assigned. |
| 0:32 | N | Step three. You won't walk alone. Your mentor will read your journal with you, every week. | Accountability partner: Lexicon #16, **documented** (Restored Ministries, S09). A young person's private writing read by staff: Dossier `diary`, **documentary** (Conley, Insider 2025; origin_intake_e1 source 11). The daily "moral inventory" (Conley 9:00–10:00). "Every week" is invented. |
| 0:36 | L | Write it all down! | Invented. Then the journal is handed to the mentor. |
| 0:40 | N | Step four. Your family walks with you. We'll be in touch with your parents. | LIA application p. 13: "It is expected that if your parents are living … you ask them to complete a Parental Reference form." The form: "We ask that each parent fill this out without conferring with the other", "Are you supportive of your son's/daughter's desire to be involved…?", "Family and Friends Workshops". Love Won Out's conference guide taught parents to intervene (origin_intake_e1 source 1). Exodus's telephone manual (1988) had a script for a parent caller (source 6). All **documentary**. |
| 0:45 | L | They'll be so relieved! | Invented. It prepares Rob's later line, "she's relieved, honestly" (`s1_end.json`). |
| 0:46 | board | a green felt tick on the family's house | His ruling: the parent's consent is a tick, not a signature. |
| 0:48 | N | Step five. Summer is for new beginnings. Your placement begins on Saturday, the twelfth of July. | Dossier `placement`, **documentary**: "arranged a residential programme with your family, then told you". LIA's youth programme: two weeks ($1,500) or eight ($2,500), with a parent (booklet p. 3). The Source as a two-week trial (Conley 13:01). **The date is invented** (canon: `s1_browser.json` "Sat 12 – Sun 13 July", the packet's "DEPARTURE Saturday", the corner's DEPART 12 JUL). 12 July 1997 was a Saturday (checked). |
| 0:49 | board | suitcase tagged NEW MORNING; calendar page JULY 1997 · 12 · SATURDAY; a felt sun | New Morning is invented (1997 canon). |
| 0:55 | L | Pack light! | Invented. The packet says: "Leave behind: music, journals, anything from 'before'" (`s1_end.json`). Belongings searched and held: Dossier `belongings`, **documentary** (Conley). |
| 0:58 | L | Ready? Your family has already said yes! | The brief's line. The packet's "[ already signed ]"; the record's "resistant — proceed; consent already on file". |
| 1:01 | CG | NEW MORNING · SUMMER PLACEMENT / CONSENT / PARENT ✓ · PASTOR ✓ · MENTOR ✓ · YOU [ OK ] | His design (13 Nov). Documented: LIA would not process an application "until all three references have been received", and one had to be "your pastor or spiritual authority" (p. 12). The applicant's own release says he signs "of my own free will" (p. 14). |
| 1:06 | CG + N | Thank you. Your confirmation was not required. | The brief's line, and the collapse. **Invented.** It says plainly what the documented paperwork hides: for a minor, the adults' signatures decided. |

*The LIA booklet:* Love in Action, *The Source: Application* and reference forms (copyright 2001), scan at
`/Users/sergiogalvaoroxo/update-available-reinterp/research/love-in-action-resource-booklet_smithsonian-scan.pdf`
(`research/` is not in git); Smithsonian NMAH Love in Action Collection, https://mads.si.edu/mads/id/NMAH-AC1428-B001-F006.
It is a 2001 form, so the tape's 1997 is earlier than the paper. These are paraphrases of a documented practice; they
are not period quotations.

## 3. The storyboard

The **corner** column says which object in the 1997 corner each step will set off, once this is built into the piece.

| time | picture | felt piece placed | corner (when built) |
|---|---|---|---|
| 0:00–0:01 | The deck starts: black, then blue, and a tracking band rolls away. | — | — |
| 0:01–0:07 | CG title on navy. | — | — |
| 0:07–0:15 | Dissolve to the felt board in a church hall; the camcorder refocuses; quiet music. | Lamby (0:08); YOU at the path's start (0:11); five numbered stones, one per word of "the next five" (0:13–0:14). | the TV clicks on behind the visitor; the piece turns them round |
| 0:15–0:23 | Step 1 card. Slow zoom to the sky. | FILE folder by stone 1; SAMPLE INTAKE strip; three answers; a typed filing label stamped beside each; all three go into the folder; YOU moves to stone 1. | the drawer files a card (drawer number: his call, not 12) |
| 0:23–0:32 | Step 2 card. | Tree "the struggle" with roots; three root tags; YOU to stone 2; the "father hunger" tag is pinned on YOU; Lamby points back at him. | the wall record (its classification row) |
| 0:32–0:40 | Step 3 card. | YOU to stone 3; MENTOR beside him; a red JOURNAL in YOU's hand, then handed to the mentor. | the record's TRUSTED CONTACT line (MentorRob) |
| 0:40–0:48 | Step 4 card. | YOU and MENTOR to stone 4; the FAMILY house on the hill; a handset at the mentor's ear and a dashed line drawn from him to the house; a green tick on the house. | PARENT REACHED → CONSENT ON FILE; the referral list |
| 0:48–0:57 | Step 5 card. | suitcase (NEW MORNING) at stone 5; a sun in the board's corner; the calendar page as the date is said; YOU and MENTOR to stone 5. | the suitcase |
| 0:57–1:01 | Wide shot: the whole board. | Lamby hops onto the hilltop. | — |
| 1:01–1:11 | Cut to the CG form. Three ticks with soft blips; the music stops; YOU [ OK ] blinks for 2.3 s; nobody presses it; it presses itself and becomes a tick. "Thank you. / Your confirmation was not required." | — | the small form brought to the eye: Parent ✓ · Pastor ✓ · Mentor ✓ · You: [ OK ] |
| 1:11–1:14 | Eject: a jolt, the picture rolls, blue, then snow and hiss. | — | the TV goes to snow |

**The 12s:** the only 12 on screen is the date (12 July). The folder says FILE, the form has no case number, and
there is no drawer in the tape.

## 4. What is placeholder or invented

1. **All display text is a draft:** the narrator's eight lines, Lamby's seven bubbles, the CG title, the small print,
   the step titles, the form.
2. **The example answers** (moon, I like music, I keep a diary). In the piece they will be the visitor's own.
3. **Invented:** "Tape 1 of 3", the small print, "every week", the date, New Morning, TriedPath Fellowship, the last
   line. Each is marked in §2.
4. **The felt Lamby is a new drawing** for this video, made from the piece's Lamby. It is not an approved asset.
5. **Fonts** are macOS system fonts rendered into the frames (Marker Felt, American Typewriter, Helvetica Neue,
   Arial Rounded, Menlo). That is fine for a draft. If the tape is built in, the piece's own fonts and its licence
   check apply.
6. **No 3D, no corner, no turn.** This is the tape alone. The TV, the turn and the objects that react are a later job,
   after his yes.

## 5. Credits

- **Script, storyboard, animation, sound design and edit:** Claude (Anthropic, Opus 5.5), UiB job 23, for *YOUR UPDATE
  HAS FAILED* (SurvivingSOGICE, University of Bergen, Center for Digital Narrative).
- **Music:** Sérgio Galvão Roxo, "Morning Joy Loop – Summer Camp Radiance – Treblo.mp3" (his own jingle), from
  `Pc_Simulation/Sources/Jingle_Brand New/`. Mono, cut to 120 Hz–3.2 kHz like a VHS linear track, looped once 16 bars
  back at 37.1 s, about 13 dB under the voice. It stops when the form waits.
- **Narrator:** build-time Supertonic 3, stock voice F1, speed 0.94, `register: apparatus`, through
  `tools/tts/render.py`. This is the same voice and speed as 1997's tape A, the fellowship's own voice
  (`data/audio/tts_manifest.json`, `tapeA_side_one_intro`). It is not the advert's M3. Lamby has no voice.
- **Sound effects** (deck, felt pats, stamps, CG blips, eject, snow): made in code for this tape (`source/audio.py`,
  seed 1997).
- **Sources:** as in §2. The Lexicon map is `LEXICON_SOURCES_VERIFIED_2026-10-11.md`; Conley is
  `RESEARCH_CONLEY_LIA_2026-11-10.md`; the dossier is `data/dossier/practices.json` and
  `data/provotypes/origin_intake_e1.json`.

## 6. Eye list for Sérgio (T81)

1. **The look.** *Choice:* a filmed felt board, with CG cards and 1990s captions. *Why:* it is the opposite of the
   advert, and it is how a church taught children. Each felt piece lands like a step being taken for you.
   *Look for:* does it read as one earnest tape? Is it too sweet, or too plain?
2. **The length.** *Choice:* 74 s; each step gets about 8 s. *Why:* that is long enough for one sentence, one piece and
   one bubble, at an instructional pace. *Could cut:* the title can lose about 1.5 s, the snow about 1 s.
3. **Lamby's lines.** *Choice:* seven short bubbles. "Hi! I'm Lamby!", "Thanks for sharing!", "Found it!", "Write it
   all down!", "They'll be so relieved!", "Pack light!", "Ready? Your family has already said yes!". *Why:* he is the
   cheerful one, and each line is kind on its face and grim underneath. "Found it!" is the tape's sharpest moment: a
   cause is pinned on you. *Look for:* is "They'll be so relieved!" too close to Rob's later line, or is the echo
   useful?
4. **The narrator.** *Choice:* the fellowship's voice (F1, slow), the same as 1997's tape A. *Why:* one organisation,
   one voice, and clearly not the advert's. The narrator says "Step one…" before each line, as a procedure would.
   *Note:* I checked the clips by length and level only. **Please listen for the pronunciation of "TriedPath".** The
   voice was given "Tried Path".
5. **The music.** *Choice:* your "Summer Camp Radiance" loop, low and dulled, from the board's first shot until the
   form waits. *Why:* the warmth is the pitch, and its stopping is the beat before the last line. *Option:* no music
   at all, only tape hiss. That would be colder and more procedural.
6. **The ending's timing.** *Choice:* the three ticks come 0.5 s apart; YOU [ OK ] then blinks for 2.3 s in silence;
   it presses itself; the line follows 0.6 s later; a 1.5 s hold; then eject and 2.4 s of snow. *Why:* the wait is
   where the visitor understands that nobody is asking. *Decide:* in the piece the visitor presses OK. Here nobody
   does, and it presses itself. Which do you want in the built version: their press, or no press at all?
7. **Also yours:** the small print ("Please watch with a parent or guardian"); the pastor appears only on the form (on
   purpose: an adult you never met signed); the drawer's number for the corner.

## 7. How to rebuild

From `output/orientation-tape/source/` (Chrome, ffmpeg, and the repo's `node_modules` and `.venv` are needed; nothing
touches the network):

```sh
python3 build_timeline.py          # timeline.js/.json and captions, from timing_raw.json (the narrator's measured lengths)
PYTHONDONTWRITEBYTECODE=1 ../../../.venv/bin/python audio.py   # mix.wav (reads ../tts/ and the jingle)
node render.mjs --preview 9.5,30   # stills in preview/, to look at
node render.mjs --full             # master.mkv, frame by frame (~3 min)
sh encode.sh                       # orientation_tape_1997.mp4, two-pass, about 11 MB
```

To re-voice a line, edit `tts/tts_manifest.json` and run `tools/tts/render.py --manifest <it> --all` from a checkout,
then re-measure `timing_raw.json` (the speech start and end of each clip) before `build_timeline.py`.
