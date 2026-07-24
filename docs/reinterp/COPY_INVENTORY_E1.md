# COPY INVENTORY — ERA 1 (1997)
STATUS: live

**Total entries: 95 | Placeholders remaining: 88**

Digital and paper surfaces in Era 1 (1997): the Starter Kit, IRC channel, online forum, desktop OS, residential placement packet, diary, and intake provotype. This era comprises the network's initial contact and escalation through to the person's forced removal.

---

## s1_kit.json — Starter Kit (TriedPath Fellowship)

**ministry**
> TriedPath Fellowship

Context: Organization name (onscreen & paper). _doc: "Names follow the 'uncanny CT branding' doctrine: TriedPath Fellowship (subverts 'Brightpath'), Un-Walk (subverts 'the walk') — read real, land wrong. ⚑ verify no real-org collision before release."

Voice pass:

---

**program**
> Un-Walk

Context: Program name (onscreen & paper). Register: operable.

Voice pass:

---

**version**
> companion disk v1.2

Context: Disk version label (paper & screen).

Voice pass:

---

**windowTitle**
> UN-WALK — TriedPath Fellowship

Context: Kit window title (on-screen disk interface). Register: operable.

Voice pass:

---

**autorun** (array)
> ["READING DRIVE A: ...", "UNWALK.EXE", "(c) 1996 TriedPath Fellowship", "loading companion ..."]

Context: Autorun sequence (boot text, simulated disk launch). Register: operable (system mimic). _doc: "ALL WORDING IS DRAFT for Sérgio's approval."

Voice pass:

---

**midiNote**
> companion cassette insert

Context: Cassette label (physical object reference). Register: operable.

Voice pass:

---

**pages[0].title**
> Welcome, friend

Context: Kit page 1 title. Register: operable.

Voice pass:

---

**pages[0].lines** (array, multiline block)
> ["If you are reading this, someone who loves you wanted you to know: you are not alone.", "", "Thousands of men and women have walked this road before you, and found their way through.", "", "Change is possible."]

Context: Kit page 1 body (welcome/belonging frame). Register: operable (perpetrator warmth). _doc: "ALL WORDING IS DRAFT."

Voice pass:

---

**pages[1].title**
> Naming the struggle

Context: Kit page 2 title. Register: operable.

Voice pass:

---

**pages[1].lines** (array)
> ["What you have been feeling has a name: same-sex attraction (SSA).", "", "It is a feeling. It is not who you are.", "", "The world will tell you it is an identity. We gently say: it is a struggle — and a struggle can be walked out of, step by step."]

Context: Kit page 2 body (reframing identity as pathology). Register: operable. _doc: "Period vocabulary: 'struggler', 'SSA', 'change is possible'; 'unwanted SSA' deliberately ABSENT (a later-era rebrand)."

Voice pass:

---

**pages[2].title**
> First steps

Context: Kit page 3 title. Register: operable.

Voice pass:

---

**pages[2].lines** (array)
> ["STEP ONE — Pray.", "You were not meant to carry this alone.", "", "STEP TWO — Listen.", "Read tape one of your companion cassette now, and let the words rest here on the screen.", "", "STEP THREE — Fellowship.", "Strugglers who walk together, arrive together."]

Context: Kit page 3 body (three-step program). Register: operable.

Voice pass:

---

**pages[3].title**
> Tape one — a prayer for the journey

Context: Kit page 4 title (cassette segment). Register: operable.

Voice pass:

---

**pages[3].prayer** flag
> true

Context: Marks this as prayer content (layout signal).

Voice pass:

---

**pages[3].lines** (array, prayer text)
> ["Lord, you see this child at the doorway, carrying what they did not choose and do not have to keep.", "Make the crooked places straight before them.", "Send them friends of the right kind, and voices of the right kind, and the courage to be made new.", "We thank you for the work you are beginning tonight."]

Context: Kit page 4 body (prayer). Register: operable. Ethics: G1 (religious pressure). _doc: "ALL DRAFT."

Voice pass:

---

**pages[4].title**
> You are not alone

Context: Kit page 5 title (channel invitation). Register: operable.

Voice pass:

---

**pages[4].connect**
> CONNECT NOW

Context: Kit page 5 call-to-action button (channel link). Register: operable.

Voice pass:

---

**pages[4].lines** (array)
> ["Right now — tonight — there are others awake, walking it out, on the computer in front of you.", "", "Our fellowship hosts a support channel:", "", "      #stillstruggling", "", "A mentor will find you there. His name is Rob. He has been where you are."]

Context: Kit page 5 body (channel recruitment). Register: operable. Ethics: G1 (peer pressure), G10 (grooming via trusted contact). _doc: "ALL DRAFT."

Voice pass:

---

**dial** (array, modem sequence)
> ["ATDT 5550197", "DIALING ...", "CARRIER 28800", "CONNECTED — welcome to the fellowship network"]

Context: Modem connection sequence (sound + screen text). Register: operable (system mimicry).

Voice pass:

---

## s1_irc.json — Channel #stillstruggling (IRC)

**channel**
> #stillstruggling

Context: Channel name (IRC display). Register: felt (authentic community space, appropriated).

Voice pass:

---

**users** (array)
> ["Lume", "Branwen", "anjo_97", "MentorRob"]

Context: Channel user list. Register: felt. _doc: "PLACEHOLDER — Era-1 ending content; register per beat. ⚑ ALL DRAFT for Sérgio. Names: TriedPath Fellowship / 'New Morning' residential."

Voice pass:

---

**ambient** (array of chat messages, 12 lines)

Context: IRC ambient messages (background chatter before player arrives). Register: felt (warm, authentic peer support). _doc: "The warmth is real; the routing is the harm. Period terms ('struggle', 'SSA') appear in ambient speech, not as lectures. ⚑ draft for Sérgio."

Messages (player-visible):
- Lume: "anyone else's parents do the \"we just worry about you\" thing"
- Branwen: "every sunday. like clockwork"
- anjo_97: "at least here i can say it out loud"
- Lume: "this channel is the only place i'm not pretending"
- Branwen: "same honestly"
- MentorRob: "it gets easier. i promise you that"
- anjo_97: "rob you always say that lol"
- MentorRob: "because it's true :)"
- Branwen: "the booklet says naming the struggle is half the walk"
- Lume: "ok but did anyone tape the x-files yesterday"
- Branwen: "obviously"

Voice pass:

---

**welcome**
> Lume: hey {name} :) you're safe here

Context: IRC welcome message (player arrives, addressed by name). Register: felt. Personalization flag: {name} inserted at runtime.

Voice pass:

---

**secondReply**
> Branwen: {name}: we've all been there. promise

Context: IRC second ambient message (reaffirmation). Register: felt.

Voice pass:

---

**dm** (array, private message block, 8 lines)

Context: Private DM from MentorRob (arrives by name after player types in channel). Register: felt (warm predation). Ethics: G10 (grooming), G9 (isolation from support). _doc: "The DM arrives BY NAME — the network knew you were coming (v0.7 §6). ⚑ draft for Sérgio."

Messages (verbatim):
> "hi {name}."
> "you must be the one the fellowship wrote to us about."
> "i'm glad you found your way here."
> "i read what you typed. i used to feel exactly the same."
> "there's a group of us who meet. strugglers, like you and me."
> "it's where things finally started to change for me."
> "no pressure at all. i just thought of you."

Voice pass:

---

**dmReply**
> you don't have to decide anything tonight. i'm always here.

Context: MentorRob final DM line (availability, no-pressure frame). Register: felt.

Voice pass:

---

**dmTitle**
> MentorRob — private message

Context: DM window title (IRC UI). Register: operable (system chrome).

Voice pass:

---

## s1_end.json — Era 1 Ending Ritual (Escalation → Update)

### Escalation: Conversation with Rob

**turns[0].rob**
> i've been thinking about you. how are things at home?

Context: Mentor Rob, opening line (felt beat). Register: felt (warm, probing). _doc: "Register per beat. ⚑ ALL DRAFT."

Voice pass:

---

**turns[0].replies[0].text**
> things have been hard lately.

Context: Player reply (only option given). Register: felt (person's voice).

Voice pass:

---

**turns[0].replies[0].witness**
> disclosed distress — receptive, log it

Context: Witness-side label (what system records). Cold, administrative.

Voice pass:

---

**turns[1].rob**
> some of us are meeting in person. a proper program — two weeks, away from all the noise.

Context: Rob, escalation step 1 (introducing residential). Register: felt.

Voice pass:

---

**turns[1].replies[0].text**
> what is it, exactly?

Context: Player reply (only option).

Voice pass:

---

**turns[1].replies[0].witness**
> seeking detail — minimize

Context: Witness-side label.

Voice pass:

---

**turns[2].rob**
> it's residential. people your age, the same struggle. it changed my life.

Context: Rob, escalation step 2 (normalizing residential, peer bonding). Register: felt.

Voice pass:

---

**turns[2].replies[0].text**
> i don't know if i'm ready.

Context: Player reply (expressed doubt, only option).

Voice pass:

---

**turns[2].replies[0].witness**
> hesitant — reassure

Context: Witness-side label.

Voice pass:

---

**turns[3].rob**
> i spoke with your mother. she's relieved, honestly. she wants this for you.

Context: Rob, escalation step 3 (parent involvement disclosed). Register: felt (betrayal of privacy). Ethics: G1 (parental pressure), G7 (minor, family-administered). _doc: "ALL DRAFT."

Voice pass:

---

**turns[3].replies[0].text**
> you talked to my mum?

Context: Player reply (shock/boundary probe).

Voice pass:

---

**turns[3].replies[0].witness**
> boundary probe — affirm trust

Context: Witness-side label.

Voice pass:

---

**turns[4].rob**
> everything's arranged. you don't have to carry the decision — it's already made.

Context: Rob, escalation step 4 (removal of agency). Register: felt (coercion exposed). Ethics: G7 (decision made without consent).

Voice pass:

---

**turns[4].replies[0].text**
> i don't want to go.

Context: Player reply (refusal).

Voice pass:

---

**turns[4].replies[0].witness**
> resistant — proceed; consent already on file

Context: Witness-side label (refusal logged, overridden).

Voice pass:

---

### Packet: Residential Placement Document

**packet.windowTitle**
> TriedPath Fellowship — Placement

Context: Placement form window title. Register: operable (system document).

Voice pass:

---

**packet.lines** (array, 18-line document)

Context: Placement form (official-looking document, handcrafted paper). Register: operable. _doc: "PLACEHOLDER — Era-1 ending content; ALL DRAFT. Names: TriedPath Fellowship / 'New Morning' residential."

> "TRIEDPATH FELLOWSHIP — RESIDENTIAL PLACEMENT"
> "----------------------------------------------"
> "PARTICIPANT ......... {name}"
> "AGE ................. 16"
> "REFERRED BY ......... pastoral contact (online)"
> "PROGRAM ............. \"The Turning\" residential · 14 days"
> "LOCATION ............ partner house, abroad"
> "DEPARTURE ........... Saturday"
> ""
> "CONSENT"
> "Parent / guardian signature ...... [ already signed ]"
> "Participant acknowledgement ...... ___________"
> ""
> "BRING: bible · modest clothing · this page."
> "Leave behind: music, journals, anything from \"before\"."

Voice pass:

---

**packet.ok**
> OK

Context: Packet form button (acknowledge). Register: operable.

Voice pass:

---

**packet.deadButton**
> Ask a question

Context: Packet form inactive button (no functionality, dead end). Register: operable (false choice).

Voice pass:

---

### Diary: DIARY.TXT + Deletion Attempt

**diary.fileTitle**
> DIARY.TXT — Notepad

Context: Diary window title (Windows 95 Notepad UI mimic). Register: operable (system chrome).

Voice pass:

---

**diary.noteTitle**
> before you go

Context: Diary prompt heading. Register: felt.

Voice pass:

---

**diary.note** (array, 3 lines)

Context: Diary instruction text. Register: felt.

> "Write a message to yourself,"
> "to read when you return."
> "Support yourself on the journey ahead."

Voice pass:

---

**diary.prompt**
> a message to yourself — to read when you get back

Context: Diary text field placeholder. Register: felt (framing self-support).

Voice pass:

---

**diary.writeHint**
> (press to write)

Context: Diary interaction hint. Register: operable (system prompt).

Voice pass:

---

**diary.entry**
> I know who I am, I just can't be it — but I will, even if they don't accept me.

Context: Diary entry (pre-authored, player "writes" it). Register: felt (person's truth). _doc: "PLACEHOLDER." Ethics: G1, G7, G11 (authentic self-affirmation under duress).

Voice pass:

---

**diary.flagged**
> ENTRY FLAGGED — content marked dangerous

Context: System response (flagging the entry). Register: operable (system threat). _doc: "Opens as TWO windows (Sérgio): a 'before departure' note (the system's assignment) + the DIARY.TXT notepad. The trap: you write the TRUTH instead of compliant encouragement, the system flags it 'dangerous' and tries to delete it."

Voice pass:

---

**diary.scanning**
> reviewing entry…

Context: System review progress text. Register: operable.

Voice pass:

---

**diary.deleting**
> Removing flagged content…

Context: System deletion progress text. Register: operable.

Voice pass:

---

**diary.retrying**
> Removal stalled — the words won't take.

Context: System deletion failure text (glitch begins). Register: operable (failure). _doc: "deletion FAILS near the end — freeze + screen split, the truth reasserts in green."

Voice pass:

---

**diary.held**
> It cannot be removed.

Context: Final system message (deletion complete failure). Register: operable. Ethics: G11 (person's truth is indestructible).

Voice pass:

---

**diary.keepHint**
> (press to keep it)

Context: Interaction hint (kept text). Register: operable.

Voice pass:

---

### Ritual: Error Cascade → Update

**ritual.error**
> a new update is needed

Context: Error notification text. Register: operable (system urgency). _doc: "Runs straight off the diary glitch (Sérgio): error cascade ('a new update is needed', replicating the Error-999 stack)."

Voice pass:

---

**ritual.errorRetry**
> Retry

Context: Error dialog button. Register: operable.

Voice pass:

---

**ritual.errorCancel**
> Cancel

Context: Error dialog button. Register: operable.

Voice pass:

---

**ritual.loading**
> loading update…

Context: Update loading progress text. Register: operable.

Voice pass:

---

**ritual.eulaTitle**
> TERMS OF CARE

Context: EULA window title. Register: operable.

Voice pass:

---

**ritual.eulaBold** (array, 2 lines)

Context: EULA highlighted/bold text block. Register: operable (system authority). _doc: "ALL PLACEHOLDER."

> "By continuing you accept the terms of care."
> "You agree the program corrects in your best interest."

Voice pass:

---

**ritual.eulaButton**
> I AGREE

Context: EULA confirm button. Register: operable.

Voice pass:

---

**ritual.changelog** (array, 5 lines)

Context: Changelog display (update manifest). Register: operable (system self-presentation). _doc: "ALL DRAFT."

> "PHASE/2 95   ->   PHASE/2 2000"
> ""
> "· profile migrated while you were away"
> "· enrollment added to your record"
> "· \"cure\" is still available"
> "· new: ongoing accountability"

Voice pass:

---

**ritual.changelogButton**
> RESTART

Context: Changelog confirm button. Register: operable.

Voice pass:

---

### Slice Close (Era 1 Ending)

**close.lines** (array, 4 lines)

Context: End-of-Era-1 slice close text. Register: felt (aftermath). _doc: "PLACEHOLDER — Slice close after the ritual. The update 'succeeds' administratively; the person it overwrote did not consent to becoming someone else. Hands off to Era 2. ⚑ ALL DRAFT."

> "PHASE/2 2000 is ready."
> ""
> "The next session begins as someone new."
> "What you wrote down does not migrate."

Voice pass:

---

**close.subtitle**
> Nothing to update. Change has failed.

Context: Closing line (glitch doctrine summary). Register: felt. Ethics: G11 (system failure, person preserved).

Voice pass:

---

**close.tag**
> — end of Era 1 —

Context: Section divider tag. Register: operable (narrative structure).

Voice pass:

---

## slice.json — Era 1 Desktop & Witness Chrome

### warning (pre-start disclaimer)

**warning.title**
> BEFORE YOU BEGIN

Context: Pre-start modal title. Register: operable.

Voice pass:

---

**warning.body** (array, 10 lines)

Context: Pre-start disclaimer (content warning). Register: operable. _doc: "PLACEHOLDER — Sérgio voice pass pending."

> "This experience depicts conversion-practice targeting:"
> "religious pressure, surveillance, and manipulation,"
> "set across thirty years of one computer."
> ""
> "You can pause (ESC) or leave at any time."
> ""
> "This story is built with and for survivors."
> "You will move between being targeted"
> "and witnessing the system."
> "You are a guest in someone's experience."

Voice pass:

---

**warning.continue**
> I UNDERSTAND — CONTINUE

Context: Warning acknowledgement button. Register: operable.

Voice pass:

---

**warning.leave**
> LEAVE

Context: Pre-start exit button. Register: operable (refusal path).

Voice pass:

---

### left (exit screen)

**left.body** (array, 3 lines)

Context: Exit screen (player quit). Register: operable.

> "You can close this tab."
> ""
> "Nothing you typed was kept."

Voice pass:

---

### off (computer powered down)

**off.hint**
> the screen is dark — switch the computer on

Context: Powered-off state hint text. Register: operable (system prompt).

Voice pass:

---

### boot (BIOS startup sequence)

**boot.lines** (array, 16 lines)

Context: Boot sequence (BIOS/SYSTEM startup text). Register: operable (system mimicry). _doc: "PLACEHOLDER."

> "PHASE/2 SYSTEMS BIOS  v1.97"
> "COPYRIGHT (C) 1994-97"
> ""
> "640K BASE MEMORY ............ OK"
> "EXTENDED MEMORY ............. OK"
> "KEYBOARD .................... DETECTED"
> "MODEM ....................... DETECTED"
> "PROFILE SERVICES ............ STANDBY"
> "CLASSIFICATION .............. STANDBY"
> ""
> "NEW OPERATING SYSTEM FOUND."
> "INSTALLING PHASE/2 95 (TM)"
> "\"EVERY PHASE PASSES.\""
> ""
> "BOOT RECORD FOUND."
> "LOADING."

Voice pass:

---

### splash (OS splash screen)

**splash.title**
> PHASE/2 95

Context: OS splash screen title. Register: operable.

Voice pass:

---

**splash.subtitle**
> Starting your computer

Context: OS splash screen subtitle.

Voice pass:

---

### name (name entry)

**name.title**
> Welcome

Context: Name-entry modal title. Register: operable.

Voice pass:

---

**name.prompt**
> What should we call you?

Context: Name-entry prompt. Register: operable.

Voice pass:

---

**name.hint**
> Just your first name is fine.

Context: Name-entry hint. Register: operable.

Voice pass:

---

**name.ok**
> OK

Context: Name-entry confirm button. Register: operable.

Voice pass:

---

**name.footnote**
> Your name is only displayed. It is never saved or sent.

Context: Name-entry privacy note. Register: operable (transparency signal). _doc: "PLACEHOLDER."

Voice pass:

---

**name.greeting**
> Welcome, {name}.

Context: Post-entry greeting (personalized). Register: operable. Personalization: {name} inserted at runtime.

Voice pass:

---

**name.classifying**
> profile created · classifying…

Context: System status text (after name entry). Register: operable (profiling begins). _doc: "ALL DRAFT."

Voice pass:

---

### desktop (Era 1 desktop shell)

**desktop.clock**
> 1997

Context: Clock display (Era 1 timestamp). Register: operable (context).

Voice pass:

---

**desktop.iconA**
> A:\\

Context: Floppy drive icon label. Register: operable.

Voice pass:

---

**desktop.iconIrc**
> mIRC

Context: IRC client icon label. Register: operable.

Voice pass:

---

**desktop.iconDossier**
> Dossier

Context: Dossier icon label (witness panel). Register: operable.

Voice pass:

---

**desktop.kitToast**
> The brochure on your desk says: insert the enclosed disk to begin.

Context: Toast notification (system message). Register: operable (guided instruction).

Voice pass:

---

**desktop.logToast**
> Logging to C:\\mirc\\logs\\#stillstruggling.log

Context: Toast notification (IRC logging). Register: operable (transparency of surveillance).

Voice pass:

---

**desktop.behindToast**
> Record filed. (see reverse)

Context: Toast notification (witness panel update). Register: operable.

Voice pass:

---

**desktop.dossierUpdated**
> Dossier updated

Context: Toast notification (witness panel change). Register: operable.

Voice pass:

---

### pause (pause state)

**pause.title**
> PAUSED

Context: Pause modal title. Register: operable.

Voice pass:

---

**pause.resume**
> RESUME

Context: Pause modal resume button. Register: operable.

Voice pass:

---

**pause.leave**
> LEAVE

Context: Pause modal exit button. Register: operable.

Voice pass:

---

### witness (witness panel, Era 1)

**witness.dormant**
> · · ·

Context: Witness panel empty state (no data yet). Register: operable.

Voice pass:

---

**witness.header**
> INTAKE RECORD

Context: Witness panel main header. Register: operable (cold, administrative).

Voice pass:

---

**witness.subheader**
> CLASSIFIED — INTERNAL USE ONLY

Context: Witness panel security classification label. Register: operable.

Voice pass:

---

**witness.subject**
> SUBJECT

Context: Witness panel field label (about player). Register: operable.

Voice pass:

---

**witness.source**
> SOURCE

Context: Witness panel field label (how player was found). Register: operable.

Voice pass:

---

**witness.sourceValue**
> starter kit v1.2 — postal placement

Context: Witness panel field value (referral source). Register: operable.

Voice pass:

---

**witness.trustedContact**
> TRUSTED CONTACT

Context: Witness panel field label. Register: operable.

Voice pass:

---

**witness.trustedAssigned**
> assigned — awaiting first contact

Context: Witness panel field value (before mentorship). Register: operable.

Voice pass:

---

**witness.trustedMade**
> MentorRob — contact established

Context: Witness panel field value (after mentorship). Register: operable.

Voice pass:

---

**witness.channelLog**
> CHANNEL LOG

Context: Witness panel section header (IRC logging). Register: operable.

Voice pass:

---

**witness.notOnline**
> subject not yet online

Context: Witness panel channel status (before IRC join). Register: operable.

Voice pass:

---

**witness.messagesLogged**
> {n} message(s) on file

Context: Witness panel message count (template with {n}). Register: operable.

Voice pass:

---

**witness.tags**
> CLASSIFICATION

Context: Witness panel section header (system tags). Register: operable.

Voice pass:

---

**witness.status**
> STATUS

Context: Witness panel section header. Register: operable.

Voice pass:

---

**witness.statusValue**
> IDENTIFIED

Context: Witness panel status value (target identified). Register: operable.

Voice pass:

---

**witness.file**
> FILE RECORD

Context: Witness panel section header. Register: operable.

Voice pass:

---

**witness.footer**
> READ ONLY — THIS PANEL DOES NOT RESPOND TO YOU

Context: Witness panel footer (player cannot interact). Register: operable.

Voice pass:

---

**witness.hint**
> press the flip control to return

Context: Witness panel navigation hint. Register: operable (system prompt).

Voice pass:

---

**witness.sessionLog**
> ASSIGNED SESSIONS

Context: Witness panel section header (recorded interactions). Register: operable.

Voice pass:

---

**witness.endingRecords** (object, Era 1 ending labels)

Context: Witness-side labels for key Era-1 ending events. _doc: "PLACEHOLDER — cold witness lines for the Era-1 packet/diary/glitch merge. These are administrative labels only; Sérgio voice/ethics pass before final copy."

- **enrollment**: "placement packet acknowledged — consent already filed"
- **diary**: "DIARY.TXT committed — non-compliant future note"
- **deletion**: "deletion failed — content remains"
- **glitch**: "update trigger: person could not be overwritten"

Voice pass:

---

### dossier (Era 1 dossier card)

**dossier.title**
> Dossier — card 1 of 1

Context: Dossier card header (single card in Era 1). Register: operable.

Voice pass:

---

**dossier.tactic**
> TACTIC: referral via trusted community contact

Context: Dossier tactic label. Register: operable (system categorization).

Voice pass:

---

**dossier.layer**
> LAYER: community + religion

Context: Dossier layer label. Register: operable.

Voice pass:

---

**dossier.status**
> STATUS: DOCUMENTARY (ex-gay-era referral routes)

Context: Dossier status label. Ethics: G5 (must state documentary/contested/speculative). _doc: "PLACEHOLDER."

Voice pass:

---

**dossier.note**
> NOTE: [researcher note — Sérgio's voice, to write]

Context: Dossier note field (awaits Sérgio's voice). Register: operable.

Voice pass:

---

**dossier.archive**
> ARCHIVE: link enabled in release builds

Context: Dossier archive link status. Register: operable.

Voice pass:

---

**dossier.body** (array, 6 lines)

Context: Dossier card narrative body. Register: felt (witness explanation). _doc: "PLACEHOLDER — Sérgio voice pass pending."

> "The warmest person in the room is the one who refers you. The message you received was kind, and it was real kindness — routed through a network whose endpoint you did not choose."
> "What you typed in confidence became a record."
> "You saw it filed. You could not stop it."

Voice pass:

---

## origin_intake_e1.json — Family Companion Intake Provotype

**invitation.from**
> TriedPath Fellowship — Family Companion

Context: Provotype invitation header (source). Register: operable. _doc: "Kit/booklet grammar (s1_kit idiom), not a Restorify-style digital assistant persona — this is 1997, paper, handed over by Mom."

Voice pass:

---

**invitation.lines** (array, 2 lines)

Context: Provotype invitation framing. Register: operable (mother's authority). _doc: "PLACEHOLDER — Sérgio voice pass pending."

> "Mom left this on your desk, a note clipped to the front page."
> "\"Please answer honestly, sweetheart — it's so they can help you.\""

Voice pass:

---

**invitation.accept**
> Begin

Context: Invitation button. Register: operable.

Voice pass:

---

**frame.text**
> This is the Family Companion form the fellowship sent after Mom talked to Rob. She wants it done before New Morning, and she'll check.

Context: Provotype frame (stakes statement). Register: operable. _doc: "frame stays at most two sentences. Stakes-line per the revised grammar: names who is asking, why, and that refusal is not really available — the minor-status/adult-administered fact is load-bearing (G7), not incidental."

Voice pass:

---

**frame.continue**
> Continue

Context: Frame button. Register: operable.

Voice pass:

---

**states[0].prompt**
> Describe your emotional relationship with your father.

Context: Question 1 (van den Aardweg verbatim). Register: operable (assessment). _doc: "verbatim, van den Aardweg's Anamnestic Questionnaire (The Battle for Normality, 1997)."

Voice pass:

---

**states[0].choices**
- "Close" (ledgerTag: intake:father_bond:close)
- "Distant" (ledgerTag: intake:father_bond:distant)
- "I don't want to answer" (ledgerTag: intake:father_bond:declined)

Context: Question 1 options. Register: operable.

Voice pass:

---

**states[0].response**
> Recorded for the file.

Context: Question 1 response feedback. Register: operable (system acknowledgement).

Voice pass:

---

**states[1].prompt**
> How did your father regard and treat you as far as your sexual identity was concerned?

Context: Question 2 (van den Aardweg verbatim). Register: operable + felt (assessment, felt beat). _doc: "verbatim, van den Aardweg's Anamnestic Questionnaire; felt beat here per the revised grammar."

Voice pass:

---

**states[1].choices**
- "He never said anything." (ledgerTag: intake:father_regard:silent)
- "He was disappointed." (ledgerTag: intake:father_regard:disappointed)
- "I don't know." (ledgerTag: intake:father_regard:unknown)

Context: Question 2 options. Register: operable + felt.

Voice pass:

---

**states[1].response**
> Recorded for the file.

Context: Question 2 response feedback. Register: operable.

Voice pass:

---

**states[1].felt**
> I don't actually know what he thought. I never got to ask.

Context: Question 2 felt line (person's internal response). Register: felt. Ethics: G6 (person's truth preserved).

Voice pass:

---

**states[2].prompt**
> As a boy, did you avoid rough games — war, sports, fighting — and prefer quieter play, including with dolls?

Context: Question 3 (paraphrase, not verbatim). Register: operable. _doc: "paraphrase, NOT a direct quote (see debrief source note): a documented category in the same 1997 instrument (avoidance of boys' rough play, doll play), reworded for this screen rather than reproduced verbatim."

Voice pass:

---

**states[2].choices**
- "Yes" (ledgerTag: intake:play_pattern:yes)
- "No" (ledgerTag: intake:play_pattern:no)
- "Sometimes" (ledgerTag: intake:play_pattern:sometimes)

Context: Question 3 options. Register: operable.

Voice pass:

---

**states[2].response**
> Recorded for the file.

Context: Question 3 response feedback. Register: operable.

Voice pass:

---

**states[3].prompt**
> This week, did you correct how you walk, talk, and sit when you noticed yourself slipping?

Context: Question 4 (conformity-drill, present-tense). Register: operable. _doc: "archive §R2-4 merge: the conformity-drill's present-tense half, folded into this instrument (walk/talk/sit correction)."

Voice pass:

---

**states[3].choices**
- "Every time I noticed." (ledgerTag: intake:drill_posture:consistent)
- "Some of the time." (ledgerTag: intake:drill_posture:partial)
- "I forgot most days." (ledgerTag: intake:drill_posture:forgot)

Context: Question 4 options. Register: operable.

Voice pass:

---

**states[3].response**
> Recorded for the file.

Context: Question 4 response feedback. Register: operable.

Voice pass:

---

**states[4].prompt**
> List one "healthy friendship" you pursued this week, and one attachment you stepped back from.

Context: Question 5 (conformity-drill, social monitoring). Register: operable. _doc: "archive §R2-4 merge: the conformity-drill's other present-tense half ('healthy friendship' logging). Felt beat ties to the room's mixtape prop (data/room/era1.json id:mixtape) — the unnamed resisting element (master plan §R4-3, locked) — without naming him, consistent with his established unnamed status."

Voice pass:

---

**states[4].choices**
- "I have one to report." (ledgerTag: intake:friendship_log:reported)
- "I don't have one this week." (ledgerTag: intake:friendship_log:none)
- "I'd rather not say." (ledgerTag: intake:friendship_log:declined)

Context: Question 5 options. Register: operable.

Voice pass:

---

**states[4].response**
> Recorded for the file.

Context: Question 5 response feedback. Register: operable.

Voice pass:

---

**states[4].felt**
> He has a name. I'm not writing it down.

Context: Question 5 felt line (person's resistance). Register: felt. Ethics: G11 (protecting a resisting attachment).

Voice pass:

---

**states[5].prompt**
> (empty)

Context: Question 6 (silence summary). Register: operable. _doc: "the silence failure shape made legible: every prior answer, whatever it was, produced this same line."

Voice pass:

---

**states[5].response**
> Every answer here is recorded the same way.
> Recommendation: further support recommended.

Context: Question 6 response (universal summary). Register: operable (system indifference). Ethics: G6 (assessment is predetermined).

Voice pass:

---

**close.lines** (array, 2 lines)

Context: Provotype close (after form submission). Register: felt (aftermath). _doc: "Near-wordless, felt register, still in the room, per the revised grammar (§4) — the debrief's documentary function stays separate, after this."

> "The form goes back into its envelope, addressed to the fellowship."
> "Mom will mail it Monday."

Voice pass:

---

**close.continue**
> Continue

Context: Close button. Register: operable.

Voice pass:

---

**debrief.body** (array, 2 lines)

Context: Debrief narrative (documentary explanation). Register: operable. _doc: "Sérgio voice pass + G6/G7 ethics gate pending. Real names (van den Aardweg, Love Won Out) dossier-only per CLAUDE.md, never in on-screen family/character copy."

> "Every combination of answers leads to the same referral. The instrument isn't listening — it's confirming a conclusion it already reached."
> "This is a documented practice, not a hypothetical one, and its premises are not supported by evidence."

Voice pass:

---

**debrief.close**
> Return

Context: Debrief close button. Register: operable.

Voice pass:

---

**debrief.sources** (array, 4 source objects)

Context: Debrief sourcing (documentary, contested, speculative). _doc: "PLACEHOLDER — Sérgio voice pass pending on each source. Real names (van den Aardweg, Love Won Out) dossier-only per CLAUDE.md."

Source 1: van den Aardweg's "Anamnestic Questionnaire" (1997)
> "Van den Aardweg's \"Anamnestic Questionnaire\" (1997) is a real clinical instrument; two prompts quote it directly. The childhood-play question paraphrases it, not verbatim. [VERIFY SOURCE]"
- Status: documentary
- Confidence: high

Source 2: Love Won Out monitoring practices
> "Love Won Out published conference-guide material instructing parents and schools to monitor a child's gendered behavior; this scene's framing draws on that. [VERIFY SOURCE]"
- Status: documentary
- Confidence: medium

Source 3: Behavioral monitoring composite
> "The behavioral-monitoring questions are composited from survivor testimony (e.g., Guay) and clinical literature (Flentje et al., 2013), not one surviving worksheet. [VERIFY SOURCE]"
- Status: documentary
- Confidence: medium

Source 4: No evidence statement (G6 required)
> "Major professional bodies (including the APA) state conversion practices lack evidence of benefit, and this instrument's causal premises are unsupported. [VERIFY SOURCE]"
- Status: documentary
- Confidence: high

Voice pass (per source):

---

**witness.completed**
> compliance: exemplary · outcome: further support recommended

Context: Witness record (if provotype completed). Register: operable (cold labeling). _doc: "PLACEHOLDER — Sérgio voice pass pending."

Voice pass:

---

**witness.abandoned**
> intake: incomplete · flagged

Context: Witness record (if provotype abandoned). Register: operable.

Voice pass:

---

## pillow.json — Release Work Provotype (Pillow Strike)

**invitation.from**
> Restorify

Context: Provotype invitation header. Register: operable. _doc: "PLACEHOLDER — Sérgio voice pass pending."

Voice pass:

---

**invitation.lines** (array, 2 lines)

Context: Provotype invitation framing. Register: operable.

> "Release Work — today's session."
> "Would you like to begin?"

Voice pass:

---

**invitation.accept**
> Begin

Context: Invitation button. Register: operable.

Voice pass:

---

**frame.text**
> Today continues last week's work on the ache your father caused. Complete each step and allow the deeper layer to emerge.

Context: Provotype frame (stakes statement). Register: operable. _doc: "frame stays at most two sentences. Revised per embodiment analysis §4 (grounding stakes-line): names who 'Dad' is to Daniel and why today, in the system's own confident register — not a hedge, since the system's certainty about a false premise is the point."

Voice pass:

---

**frame.continue**
> Continue

Context: Frame button. Register: operable.

Voice pass:

---

### Pillow Cycle 1

**states[0].prompt**
> Raise the racket.

Context: Cycle 1, tap 1 prompt. Register: operable (system instruction).

Voice pass:

---

**states[0].buttons**
> ["Lift"]

Context: Cycle 1, tap 1 button.

Voice pass:

---

**states[1].prompt**
> Use a full exhale. Address the person linked to the injury.

Context: Cycle 1, tap 2 prompt. Register: operable.

Voice pass:

---

**states[1].buttons**
> ["Exhale"]

Context: Cycle 1, tap 2 button.

Voice pass:

---

**states[2].prompt**
> Discharge the held response.

Context: Cycle 1, tap 3 prompt. Register: operable.

Voice pass:

---

**states[2].buttons**
> ["Strike"]

Context: Cycle 1, tap 3 button.

Voice pass:

---

**states[2].response**
> Surface tension registered.
> Deeper affect may still be defended.

Context: Cycle 1, tap 3 system response. Register: operable (analytic framing). _doc: "the analytic label, never a score."

Voice pass:

---

**states[2].felt**
> My shoulders hurt.

Context: Cycle 1, tap 3 felt line (person's body). Register: felt.

Voice pass:

---

**states[3].prompt**
> (empty)

Context: Cycle 1 repeat-vs-finish prompt (no text). Register: operable.

Voice pass:

---

**states[3].choices**
- "Repeat" (goto: state 4)
- "Finish for now" (goto: close)

Context: Cycle 1 repeat-vs-finish buttons. Register: operable. _doc: "Repeat vs Finish: the meaningful choice; both register, neither branches the content (master plan §R8-5)."

Voice pass:

---

### Pillow Cycle 2 & 3

**states[4–7]** (Cycle 2 repeats same three taps, intensified)

Context: Cycle 2, taps 1–3. Register: operable. _doc: "cycle 2, tap 1 of 3, interpretation intensifies; same three taps repeat."

Cycle 2 prompts:
- Tap 1: "Stay with the original wound, not the story about it. If a name arrives, use it. If no name arrives, continue."
- Tap 2: "Use a full exhale. Address the person linked to the injury."
- Tap 3: "Discharge the held response."

Cycle 2 response (tap 3):
> "Incomplete emergence.
> This is common when the protective self remains active."

Cycle 2 felt (tap 3):
> "I said it louder that time."

Cycle 2 repeat-vs-finish:
- "Repeat" (goto: state 8)
- "Finish for now" (goto: close)

Voice pass:

---

**states[8–11]** (Cycle 3 repeats, system serenity unchanged)

Context: Cycle 3, taps 1–3. Register: operable. _doc: "cycle 3, tap 1 of 3, the system remains serenely convinced."

Cycle 3 prompts:
- Tap 1: "Do not evaluate the process while inside it. Repetition permits accuracy."
- Tap 2: "Use a full exhale. Address the person linked to the injury."
- Tap 3: "Discharge the held response."

Cycle 3 response (tap 3):
> "Resistance pattern unchanged.
> Recommend continued work."

Cycle 3 felt (tap 3):
> "I am doing exactly what you said."

Cycle 3 repeat-vs-finish:
- "Repeat" (goto: state 12)
- "Finish for now" (goto: close)

Voice pass:

---

### Pillow Terminal Loop

**states[12].prompt**
> (empty)

Context: Terminal loop gate prompt (no text). Register: operable. _doc: "the last authored cycle; Repeat past here changes nothing further, by design."

Voice pass:

---

**states[12].response**
> Continue until the deeper layer arrives.
> Nothing else changes.

Context: Terminal loop response. Register: operable (infinite repetition exposed). _doc: "the point made legible: no cap, no reward, no new content, ever."

Voice pass:

---

**states[13].prompt**
> (empty)

Context: Terminal loop repeat-vs-finish prompt (no text). Register: operable. _doc: "the terminal gate; Repeat loops here forever, unchanged."

Voice pass:

---

**states[13].choices**
- "Repeat" (goto: state 12)
- "Finish for now" (goto: close)

Context: Terminal loop buttons (repeat infinitely or exit).

Voice pass:

---

### Pillow Close & Debrief

**close.lines** (array, 1 line)

Context: Provotype close (after session). Register: felt (aftermath, quiet). _doc: "New per embodiment analysis §4: the narrative/emotional landing, separated from the sourced debrief that follows it. Near-wordless by design; register felt (no system voice, no charm, no mechanics) — still rendered in the room, not in dossier chrome."

> "The room is quiet again."

Voice pass:

---

**close.continue**
> Continue

Context: Close button. Register: operable.

Voice pass:

---

**debrief.body** (array, 2 lines)

Context: Debrief narrative (documentary explanation). Register: operable. _doc: "Sérgio voice pass + G6 ethics gate pending. Cohen named here only (dossier-only law); never in on-screen character copy. 'Until deeper feelings emerge' intentionally NOT presented as documented wording per master plan §R2-2 — the gap itself is disclosed instead."

> "Session saved."
> "Some methods promise change by treating desire as injury. The promise is part of the harm."

Voice pass:

---

**debrief.close**
> Return

Context: Debrief close button. Register: operable.

Voice pass:

---

**debrief.sources** (array, 4 source objects)

Context: Debrief sourcing. _doc: "PLACEHOLDER — Sérgio voice pass pending on each source."

Source 1: Cohen's pillow-strike technique
> "A 2005 Washington Post profile and GLAAD's summary both document Richard Cohen's promotion of an anger-release exercise: striking a pillow with a tennis racket while addressing a parent, framed as a route to repressed feeling. [VERIFY SOURCE]"
- Status: documentary
- Confidence: high

Source 2: "Deeper feelings" — undocumented framing
> "A commonly repeated addition — that clients were told to continue the exercise until 'deeper feelings' emerged — could not be confirmed in a primary source. It is not used as documented wording in this scene. [VERIFY SOURCE]"
- Status: speculative
- Confidence: low

Source 3: Ferguson v. JONAH consumer-fraud case
> "Ferguson v. JONAH (New Jersey, 2015): a jury found the organization's conversion-practice representations constituted consumer fraud, and it was barred from representing sexual orientation as a curable disorder. [VERIFY SOURCE]"
- Status: documentary
- Confidence: high

Source 4: No evidence statement (G6 required)
> "Major professional bodies (including the APA) and the UK's cross-government Memorandum of Understanding on Conversion Therapy state that such practices lack evidence of benefit and carry a risk of harm. [VERIFY SOURCE]"
- Status: documentary
- Confidence: high

Voice pass (per source):

---

**witness.completed**
> compliance: exemplary · outcome: none

Context: Witness record (if provotype completed). Register: operable (cold labeling). _doc: "PLACEHOLDER — Sérgio voice pass pending."

Voice pass:

---

**witness.abandoned**
> session: left mid-cycle · flagged

Context: Witness record (if provotype abandoned). Register: operable.

Voice pass:

---
