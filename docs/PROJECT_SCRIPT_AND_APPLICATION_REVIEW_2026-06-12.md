# Project Script and Application Review

For: Claude / future AI collaborators  
Project: `YOUR UPDATE HAS FAILED` / PC Simulator / SurvivingSOGICE  
Date: 2026-06-12  
Reviewer posture: exploratory, critical, design-thinking. No implementation changes recommended here should be made until Sergio confirms direction.

## 0. Scope and Sources Read

This review examines both the written production design and the current application scaffold.

Required project instructions were followed first:

- `AGENTS.md` / `CLAUDE.md`
- `docs/ETHICS_CONSTRAINTS.md`
- `docs/PRODUCTION_SCRIPT_v0.3.md`
- `docs/SCRIPT_UPDATE_v0.4.md`
- `docs/SCRIPT_UPDATE_v0.5.md`
- `docs/SCRIPT_UPDATE_v0.6.md`

Additional context reviewed:

- `docs/PRODUCTION_SCRIPT_v0.2.md`
- `docs/CREATIVE_ANALYSIS_v1.md`
- `docs/ASSET_STRATEGY.md`
- `docs/BUILDING_GUIDE.md`
- `README.md`
- `BUILD_LOG.md`
- `package.json`
- `index.html`
- `vite.config.ts`
- `src/main.ts`
- `src/engine/app.ts`
- `src/desktop/os.ts`
- `src/desktop/apps/irc.ts`
- `src/witness/intake.ts`
- `src/state/ledger.ts`
- `src/desktop/theme/era1.ts`
- `src/desktop/theme/chrome.ts`
- `data/strings/slice.json`
- `data/dialog/s1_irc.json`
- `data/paths.json`
- `tools/check-invariants.mjs`

Verification run during review:

- `npm test` passed: invariant scanner reports no forbidden network/storage tokens in `src/`.
- `npm run build` passed: TypeScript and Vite production build succeed.
- Build warning: generated JS chunk is large, about 1.99 MB / 505 KB gzip, likely because PlayCanvas is bundled into the main chunk. This is not fatal at this stage.

## 1. Executive Verdict

The project makes strong conceptual sense. Its central metaphor, conversion-practice rebranding as software update, is unusually coherent because it works at several levels at once:

- It explains the historical rebranding pattern: cure, support, flourishing, exploratory care, AI/platform capture.
- It gives the application a native ritual: notification, EULA, install, restart.
- It turns consent theater into interaction rather than exposition.
- It makes the ending legible: the update that failed was the system's attempt to fix what was never broken.

The current application, however, is much smaller than the script. It is a successful vertical slice, not the full piece. It currently implements:

- content warning with delayed continue;
- BIOS and splash boot;
- name entry;
- memory-only ledger;
- Era 1 desktop;
- mIRC channel with MentorRob DM;
- log toast;
- browser flip to witness side;
- non-interactive intake record;
- first dossier card;
- no-network/no-storage invariant test.

It does not yet implement:

- the 3D room;
- browser drag-to-look;
- WebXR / Quest body-turn;
- `?flat=1`;
- path selection;
- Stage 2, 3, or 4;
- software update transitions;
- EULA/changelog ritual;
- Assistant;
- respite;
- persona cards;
- full Dossier system;
- schema/lint enforcement for scene `register`, `tone`, dossier `status`, or source verification;
- runtime scene graph based on `data/paths.json`;
- idle wipe;
- CSP deployment hardening.

This is not a failure. It is a normal and healthy distance between an ambitious production script and a first build. The current slice proves the most important foundation: the offscreen desktop canvas, PlayCanvas texture, flip, input routing, memory ledger, and witness/dossier grammar can work.

My strongest recommendation is to treat the next phase as a "vertical slice plus grammar lock" phase, not a content expansion phase. Before building all stages, lock the scene/data schema, the update ritual, the path structure, the register rules, and the flat/room split. Otherwise the project risks becoming a beautiful stack of handcrafted scenes that cannot be safely maintained by Sergio and future AI collaborators.

## 2. What the Project Is Really About

The project is not simply "a VR piece about conversion therapy online." It is more precise and more interesting:

> A simulated computer lets the user experience how systems of help, care, faith, wellness, community, and platform personalization can become recruitment infrastructure, while the witness side shows how each apparently intimate action is reclassified by a hostile bureaucracy.

The thesis currently has five strong mechanisms:

1. The typed name becomes the data point.
2. The flip turns experience into witnessing.
3. The dossier restores context and speaking place.
4. The update ritual shows failure rebranded as improvement.
5. The final "your update has failed" line collapses the system's accusation into the project's moral reversal: nothing about the person needed updating.

The strongest part of the design is that it refuses a simple villain. The mIRC beat already demonstrates this: MentorRob is not written as a cartoon predator. The line "no pressure at all. i just thought of you." is effective because it is kind, plausible, and dangerous only in its routing. That is exactly the tone this project needs.

## 3. Current Application Assessment

### 3.1 Architecture

The technical architecture matches the standing orders:

- Vite + TypeScript.
- PlayCanvas as npm package.
- Single HTML canvas.
- Offscreen 2D desktop canvas rendered as a PlayCanvas texture.
- `FILTER_NEAREST` for the desktop and witness textures.
- Memory-only state in `src/state/ledger.ts`.
- Narrative strings and mIRC dialog in `data/`.
- Browser flip control implemented as a DOM button.
- Witness side rendered as a second screen plane and made non-interactive.

This is a sound foundation. The current app makes the right first bet: the desktop is the real stage, the 3D world is staging.

### 3.2 Current Vertical Slice

The current beat flow is:

1. Warning screen.
2. BIOS boot.
3. PHASE/2 splash.
4. Name entry.
5. Era 1 desktop.
6. mIRC channel.
7. User typing causes warm replies.
8. MentorRob DM arrives.
9. Ledger records `mirc-log` and `pastoral-referral`.
10. Flip becomes meaningful.
11. Witness side shows intake record using the typed name and message count.
12. Return unlocks dossier card 1.

This is the right first slice. It tests the core grammar: intimacy on the front side, classification on the back side, explanation through dossier.

### 3.3 Current Strengths

- The code is small and readable.
- The app has no backend and no runtime network surface in `src/`.
- The invariant checker is simple but valuable.
- The warning respects the four-second minimum.
- The "Leave" path wipes the ledger.
- The flip no longer hijacks normal typing; it uses F2 and the button.
- The witness side is deliberately inert.
- The intake record uses actual ledger state, not only authored text.
- The era palette is centralized.
- The current mIRC scene is emotionally credible.

### 3.4 Current Gaps and Risks

The gaps below are not demands for immediate code changes. They are the main design/production risks to resolve before expansion.

#### Gap A: Design Canon and App Data Are Not Yet Connected

The docs specify a scene graph in `data/scenes/`, path membership, register flags, tone values, persona cards, era updates, and dossier metadata. The app currently hardcodes most flow in `DesktopOS` and `IrcApp`.

This is fine for a first slice, but it becomes dangerous if continued too long. The project instruction says narrative content lives in `data/` and display text lives in `data/strings/`; currently several display strings still live in code, including BIOS lines, `MENU`, `MentorRob`, and some witness artifact labels.

Recommendation:

- Before adding Stage 2, introduce a lightweight scene/beat data schema.
- Do not overbuild an engine; just make enough structure that Sergio can edit text/sequence safely.
- Move all display strings out of code when each module is touched.

#### Gap B: `data/paths.json` Is a Placeholder

`data/paths.json` currently contains only:

```json
{
  "full": ["s0_boot"],
  "short": ["s0_boot"]
}
```

The design canon depends heavily on Full Path, Short Path, and later Open Desk. The app does not yet know what a path is.

Recommendation:

- Define path data before building Stage 2.
- Treat path selection as a first-class Stage 0 boot decision.
- Make the Short Path real early, because it will discipline pacing and festival viability.

#### Gap C: The Flat Fallback Is Required but Not Present

The README says `?flat=1` is planned; AGENTS says it must always render the desktop canvas alone. The current app always starts the PlayCanvas scene with screen planes.

Recommendation:

- Implement `?flat=1` soon, before room/XR complexity.
- Make it a baseline test target for classrooms, archival use, and debugging.
- The flat build should not be treated as second-class; it is the universal version.

#### Gap D: The Room Is Absent

The current camera sees only planes in black space. The docs require a soft lo-fi room, back-of-house, and later XR. The absence is expected for the current milestone, but the flip's emotional meaning will be limited until the player senses a body and a room.

Recommendation:

- Build one very small Era 1 room next, but do not over-polish it.
- Use the room to prove the soft lo-fi doctrine: life side soft, witness side sharp.
- Do not add locomotion, extra spatial UI, or decorative spectacle.

#### Gap E: Dossier Metadata Is Not Enforced Yet

The first dossier card includes a status line in `data/strings/slice.json`, but there is no data schema enforcing `status: documentary | contested | speculative`.

This matters because the project has strict source and status ethics.

Recommendation:

- Make dossier cards structured data before adding card 2.
- Enforce required `status`.
- Require `source_status` or `verification` fields.
- Preserve `[VERIFY SOURCE]` markers until Sergio verifies.

#### Gap F: Idle Wipe Is Not Yet Implemented

The ledger wipes on Leave and `beforeunload`, but not on idle reset/refusal endings. The current slice has no idle loop yet, so this is not a bug today. It will become a hard invariant once Open Desk, festival mode, or restarts exist.

Recommendation:

- Add idle wipe as soon as attract/restart loops appear.
- Add a test or static check for all endings calling `wipeLedger`.

#### Gap G: CSP Is Promised but Not Yet Present

README says CSP will pin the no-network guarantee. Current code has no CSP header or meta policy visible in `index.html`.

Recommendation:

- Add deployment CSP before public hosting.
- Static scanner is useful but not enough by itself.

#### Gap H: Performance Budget Is Not Yet Testable

The build passes, but PlayCanvas is bundled into one large chunk. The current scene is tiny, so no problem yet. Quest performance will be determined later by room assets, render texture update strategy, and draw calls.

Recommendation:

- Do not optimize prematurely.
- But establish a simple performance checklist before importing 3D assets.
- Keep render-texture uploads dirty-only, as currently intended.

## 4. Script and Narrative Assessment

### 4.1 What Works

The project has an unusually strong metaphorical engine. "Update" is not just a title; it is:

- a historical explanation;
- an interface ritual;
- a consent critique;
- a pacing device;
- a stage transition grammar;
- a final moral reversal.

That is rare. Most interactive documentary projects carry a metaphor at the top and then build ordinary scenes underneath. This one can make the metaphor operational.

The strongest writing design choices are:

- the system updates because it failed, not because the player failed;
- refusal cannot be solved inside the Offer's language;
- the true refusal is the flip;
- respite is real and never a trap;
- the Assistant is absent in Stages 0-1;
- satire is limited to perpetrator self-presentation;
- the contested clinical scene remains unresolved and unsatirized;
- the final hope is a task, not a false prediction.

### 4.2 The Core Risk: Too Many Brilliant Systems

The documents contain many good ideas:

- update ritual;
- Assistant;
- Paths;
- personas;
- respite;
- TransJesus stream;
- SOGICEfy;
- Zap!/JUST CHANGE ad-game;
- dossier;
- computed intake;
- Offer refusal ladder;
- flat fallback;
- 3D room;
- XR physical turn;
- convergence scene;
- archive/speaking-place ending.

Each is defensible. Together, they risk overwhelming the build and the audience.

The danger is not conceptual incoherence; it is density. A 35-40 minute experience can hold a lot, but only if the audience understands which mechanic is primary at any given moment. The current design has three competing protagonists:

1. the player's name/data point;
2. the Assistant as evolving character;
3. the update system as historical machine.

All three can coexist, but the hierarchy must be clear:

- The name/data point is the emotional spine.
- The update system is the historical engine.
- The Assistant is a recurring surface/personification, not the main character.

If the Assistant becomes too charming or too narratively central, it may steal the ending from the survivor/speaking-place structure.

### 4.3 The Persona Question Is Important

The design now says the typed name remains constant while the person changes per era through persona cards. This is conceptually strong but potentially confusing.

Possible audience confusion:

- "Is this me?"
- "Am I playing one person?"
- "Why does my name appear across different people's machines?"
- "Am I witnessing composites or becoming them?"

This can be solved, but it needs precise language. The opening contract should establish:

> Your name is the data point the system follows. The lives are composites. You are a guest in each machine.

That framing protects against both over-identification and confusion.

### 4.4 The Title Is Strong but Needs Context

`YOUR UPDATE HAS FAILED` is powerful inside the experience. It is riskier as a public title because it can be read as "you failed to update."

The v0.6 recommendation is right:

- Use "Your update has failed" as the system's final line.
- Immediately flip it with dossier language: nothing about you was broken.
- For public-facing title, consider whether `UPDATE AVAILABLE -> UPDATE FAILED` is safer and clearer.

My professional recommendation:

- Public title: `UPDATE AVAILABLE` with animated corruption into `UPDATE FAILED`.
- In-experience final accusation: `Your update has failed.`
- Public subtitle: "An experience about a system that keeps failing to fix what was never broken."

### 4.5 The mIRC Beat Is a Very Good Anchor

The current `#stillstruggling` scene is a good first beat because it avoids melodrama. It lets the player feel:

- the warmth of anonymous community;
- the hunger for safety;
- the plausibility of a trusted mentor;
- the violation of private feeling becoming a record.

The line "you're safe here" is especially important because the scene later proves that safety can be real at one level and compromised at another. That complexity is the project's ethical intelligence.

One caution: the current DM sequence triggers after the second user channel message. Since the player can type anything, the system will react regardless of what was typed. This is acceptable for the slice, but future versions should make the mechanism legible without pretending to understand free text. For example, the system can classify "participation," "late session," or "private disclosure opened," not semantic content it did not actually parse.

## 5. Ethical Assessment

### 5.1 Current Compliance

Current slice appears aligned with the ethics constraints:

- No storage or transmission of user input.
- No real people, real organizations, or real likenesses in current content.
- Content warning appears before play.
- Leave works.
- The first targeted interaction is warm and plausible, not mocking.
- Witness side classifies behavior without giving the player false agency.
- Dossier card has a documentary status line.

### 5.2 Ethical Risks to Watch

#### Risk 1: Reusing User Text

The script plans to replay user-authored text in later forms and intake records. This is powerful, but it can feel violating in a way that belongs either to the system or to the artwork itself.

Guideline:

- Re-display user text only when the system's violation is clearly framed.
- Always keep it session-only.
- Consider a preface line in the warning or name screen: "Some words you type may return inside this session as part of the system's record."

This may reduce the shock, but it increases care. Sergio should decide how explicit to be.

#### Risk 2: TransJesus and Respite

The "corrupted file that survives" idea is one of the best concepts in the project. It is also high-stakes because it touches queer joy, religion, archive, and targeting.

Guideline:

- It must be co-written or approved by queer/trans readers.
- It must not become camp spectacle that drowns the care function.
- The system can flag around it, but the stream itself must never betray.
- It should be shorter and more precious than the surrounding machinery.

#### Risk 3: Contested Clinical Scene

The instruction is clear: no satire, two captions, unresolved.

Guideline:

- Do not let Assistant, UI jokes, achievements, or glitch spectacle enter this scene.
- If interactivity exists, it should be minimal or absent.
- The scene's ambiguity must not become "both sides are equally true." It should mean: the same session can be described through competing frames whose consequences matter.

#### Risk 4: Dossier Voice

Sergio owns dossier wording and survivor-adjacent text. Future Claude/Codex agents should draft scaffolding, not final moral language.

Guideline:

- Put placeholder notes where needed.
- Use `[VERIFY SOURCE]` liberally.
- Do not invent citations.
- Do not write in a survivor voice unless Sergio specifically provides or approves it.

## 6. Application Design Improvements

These are recommendations, not implementation instructions.

### 6.1 Build the "Grammar Lock" Before More Content

Next design/build milestone should lock:

- `?flat=1`;
- path selection;
- basic scene schema;
- register/tone fields;
- structured dossier cards;
- update transition data shape;
- one room plus witness side;
- all display strings in `data/strings/`.

This will let future content expansion happen safely in data.

### 6.2 Make Stage 0 Do More Orientation Work

Stage 0 currently does warning, boot, and name. The script also needs:

- path choice;
- persona/composite framing;
- flip tutorial;
- contract language about witnessing;
- maybe a gentle explanation that typed text may return within the session.

Stage 0 must be careful not to become too wordy. Recommended structure:

1. Content warning.
2. Session length boot menu.
3. Name entry.
4. One-line contract: "Your name is the data point. The lives are composites. You are a guest in each machine."
5. Harmless flip rehearsal.
6. Era 1 boot.

### 6.3 Keep the First Slice Emotionally Bare

Do not add the Assistant to Stage 1. The current mIRC loneliness is valuable. If anything, make Stage 1 slower and more physically situated once the room exists:

- modem sound;
- CRT warmth;
- envelope/pamphlet prop;
- quiet clock;
- a room that feels ordinary, not horror-dark.

The first act should prove the project does not need spectacle to work.

### 6.4 Treat the Update Ritual as the Main Stage-Transition Scene

The update ritual should not be a decorative loading screen. It is one of the project's best arguments.

Recommended design target:

- The first update transition should be fully playable before Stage 2 content is fully built.
- "Remind me later" must work once and feel tempting.
- EULA scroll should be a small act of consent theater, not a huge reading burden.
- Changelog should be concise and devastating.
- The historical breakage trigger should appear just before the update, so the player feels: "They were caught" -> "Oh no, they are updating."

### 6.5 Keep Respite Distinct From Operable Satire

The docs already distinguish:

- `respite`: genuine queer joy, never a trap;
- `operable`: system surfaces that may be charming/playful and then curdle.

This distinction is crucial. SOGICEfy-as-pleasure and SOGICEfy-as-correction should not blur.

Recommendation:

- Label scenes strictly in data.
- Do a laughter audit in playtests: laughter in `felt` scenes is a bug; laughter in `operable` may be intended; laughter in `respite` should feel like warmth, not ridicule.

### 6.6 Make the Dossier Feel Less Like a Pop-Up and More Like a Return of Agency

The current dossier card is functional. Future dossier design should feel like:

- a named, grounded interruption of the system;
- a handrail, not an encyclopedia;
- something the player can trust because it does not manipulate.

Recommendation:

- Keep dossier cards short.
- Use status/source metadata visibly.
- Let the card explain the mechanism in plain language.
- Leave archive depth to optional links after the card.

### 6.7 Use Audio as a Structural Layer

Audio is not implemented yet beyond implied design. This project will benefit enormously from sound:

- modem and hard drive for era embodiment;
- notification sounds for update ritual;
- dry witness-side office tone;
- small UI clicks;
- breath/quiet during respite;
- Assistant cadence matching Pastor.AI in Stage 4.

Recommendation:

- Build audio early enough to test pacing.
- Avoid constant ominous drones.
- Let the life side sound ordinary; let the system side sound precise.

## 7. Production Roadmap Recommendation

### Phase 1: Finish the Current Slice as a True Vertical Slice

Goal: Stage 0-1 works in flat/browser-room mode with a real room, flip rehearsal, mIRC, witness, dossier.

Must include:

- `?flat=1`;
- one Era 1 room;
- one witness back-of-house space;
- all Stage 1 display text in data;
- structured dossier card 1;
- path placeholder that does not yet branch deeply;
- idle wipe if restart/attract appears.

### Phase 2: Build the Update Transition Once

Goal: Prove notification -> remind later -> EULA -> install/changelog -> restart.

Use one transition only, Era 1 -> Era 2. Do not build all stage content first.

### Phase 3: Build Short Path Skeleton

Goal: Stage 0 -> Stage 1 -> update bridge -> Stage 4 condensed -> Offer -> Close.

This tests the thesis fastest.

### Phase 4: Add Full Path Stages

Only after the grammar is solid:

- Stage 2 worksheet/forum/retreat manifest;
- Stage 3 wellness/app/CRM;
- Stage 4 AI/feed/contested clinic;
- convergence;
- close.

### Phase 5: XR/Quest Polish

The XR layer should be a proof of bodily witnessing, not an everything-in-VR content rebuild.

Focus:

- physical turn;
- seated comfort;
- text legibility;
- render texture performance;
- no locomotion;
- one in-headset feel pass per XR-touching milestone.

## 8. Questions for Sergio

These questions should be answered before major implementation continues.

### A. Identity and Persona

1. Should the user understand the typed name as "their own name," "the data point," or "a witness handle"?
2. When persona cards appear, should the typed name be applied to each composite person, or should the typed name remain visibly separate from the composite persona's name?
3. Do you want one constant protagonist across eras as an alternate path later, or is the multi-persona witness structure now the intended default?
4. How explicit should the opening be that "you are a guest in someone's experience" and that the lives are composites?

### B. Title and Public Framing

5. For public title, do you prefer `YOUR UPDATE HAS FAILED`, `UPDATE AVAILABLE`, or the two-state `UPDATE AVAILABLE -> UPDATE FAILED` mark?
6. If `YOUR UPDATE HAS FAILED` is public-facing, what exact subtitle or poster line should always accompany it to prevent the "you failed" reading?
7. Should `PC Simulator` remain an internal name only, or appear in academic/program contexts?

### C. Stage 0 and Consent

8. Should the warning disclose that words typed by the user may reappear later inside the same session as part of the system's record?
9. Should path choice happen before or after name entry?
10. Should the first flip rehearsal happen before any personal data is typed, or after name entry so the ledger logic is introduced immediately?

### D. The mIRC Beat

11. Is MentorRob's current warmth right, or should he be more ambiguous/less mentor-coded at first?
12. Should the player be required to type two messages before the DM arrives, or should the DM also arrive after a time delay for players who hesitate?
13. Should the channel contain more queer joy before the recruitment route appears, or is the current minimal warmth enough?

### E. Assistant

14. Are you comfortable with the Assistant becoming a memorable character, knowing it may compete with the update system for audience attention?
15. Should the Assistant ever be visually cute, or should it be helpful but slightly sterile from the start?
16. Should the Assistant's dismissal data be shown immediately on the witness side, or saved for later stages?

### F. Respite

17. What is the first respite scene you want to build: TransJesus stream, music player, or an existing mini-game?
18. Should respite be optional, required, or lightly discoverable?
19. How clean/joyful should the final TransJesus playback be at the Close?

### G. Update Ritual

20. Which historical breakage should trigger the first update in the build prototype?
21. How legalistic should EULA text feel: readable and sharp, or dense enough that scrolling becomes the point?
22. Do you want to co-write the first EULA/changelog before any assistant drafts it?

### H. Dossier and Sources

23. What is the desired voice of Dossier card 1: researcher, witness, curator, or Sergio's first-person academic voice?
24. Should dossier cards include archive/source links during the experience, or only in the Close?
25. Where is the verified knowledge base for source checking, and which sources are already safe to cite?

### I. Application Priorities

26. Should the next technical milestone be `?flat=1`, the 3D room, the update ritual, or path selection?
27. For near-term review, do you want a browser-only polished slice first, or a rough Quest 3 turn as early as possible?
28. Is festival/short-path timing a real near-term constraint, or should the full path guide development for now?

## 9. Guidance for Future Claude/Codex Agents

Do not treat this review as permission to implement. It is a design report.

Before any content work:

- reread `ETHICS_CONSTRAINTS.md`;
- reread the latest production script/update docs;
- keep satire only in perpetrator self-presentation;
- never write final survivor-adjacent or dossier wording without Sergio approval;
- use `[VERIFY SOURCE]` for anything not verified;
- preserve no-network/no-storage invariants;
- prefer `data/` edits over `src/` edits for narrative changes.

Recommended immediate next step after Sergio answers questions:

> Create a "vertical slice grammar" task: implement `?flat=1`, define the minimal scene/dossier/path schema, move remaining Stage 1 display strings into data, and build one soft-lo-fi Era 1 room with witness-side back-of-house. Do not expand to Stage 2 until this grammar is stable.

## 10. Final Critical Note

This project is strongest when it trusts ordinary interfaces. The danger is not that the audience will miss the argument unless every idea is shown. The danger is that too many ideas will compete with the one act that matters most:

> I gave the machine a name, I used it like a normal computer, I turned around, and I saw what it had made of me.

Everything else should serve that.

---

# Addendum A: Sergio Response and Revised Design Direction

Date: 2026-06-12  
Purpose: incorporate Sergio's answers and add design ideas for how to use the project's many systems without overloading the piece.

## A1. Sergio's Answers, Captured for Claude

These replace or clarify the open questions in section 8 above.

### Identity and Persona

Sergio's direction:

- The user is "a witness overall."
- The experience is about perspective-taking: each era can belong to a different person, because each era stages a different logic by which technology is misused for conversion-practice targeting.
- The typed name should not be bluntly explained as a data/privacy mechanic. It appears at the end next to the other characters, so the audience feels implicated and proximate rather than safely outside the issue.
- The machine starts blank and tries to build a user profile. It talks to the user because it wants data, and the targeting logic grows from that extraction.

Updated interpretation:

The user is not exactly "playing themselves" and not exactly "playing one victim." The user is a witness-participant whose name becomes a proximity device. The name should make viewers feel involved in the machinery, especially people who may enter thinking conversion practices are acceptable or distant from them.

Design rule:

> Do not over-explain the name. Let the system's behavior teach it.

### Persona Cards

The multi-persona structure now feels like the right default. Each era is one person's experience, tied to a specific technological/social logic:

- Era 1: early online/community referral.
- Era 2: pseudo-support / "strugglers" / managed attraction language.
- Era 3: wellness, commerce, flourishing, appified belonging.
- Era 4: anti-trans / exploratory / platform and AI capture.

The persona card should not feel like a museum label. It should feel like logging into a user account or creating/entering a profile on the machine.

Possible phrasing direction, not final copy:

- `NEW USER FOUND`
- `PROFILE LOADING`
- `This machine belongs to: ____`
- `You are entering their session.`

Avoid:

- blunt methodology language before the experience;
- academic explanation too early;
- "this is a composite" as a front-loaded distancing device.

The composite/source explanation belongs later, in the dossier/end material.

### Warning and Disclosure

Sergio does not want explicit disclosure that typed words may reappear later. It feels lame and too blunt.

Updated rule:

> Preserve storytelling involvement. Do not pre-explain the mechanism unless required for care/safety.

The warning should still satisfy ethical access needs, but it should not flatten the narrative by explaining the trick.

### Path Choice

Path choice should happen "in the process," as part of user/profile creation. It should feel like making a new user on a blank computer, not selecting a mode.

Design implication:

- Session length/path choice can be part of the account/profile setup.
- The machine's questions should feel useful and ordinary while also being extractive.
- This is the first demonstration that the system needs the user to answer so it can target them.

### Flip Timing

The flip should happen after name/profile creation, probably while mIRC is happening. The first meaningful witness moment can reveal both victims and people trying to target the user.

Updated direction:

- Do not front-load an empty tutorial if it weakens the story.
- Teach the flip when there is something narratively hot to see.
- If a technical rehearsal is needed, hide it inside the mIRC moment rather than before the story starts.

### MentorRob

Sergio does not yet understand MentorRob's storytelling role and asks if he is equivalent to the Assistant.

Clarification:

MentorRob should not be the Assistant. He should be the first human-seeming bridge from community warmth into recruitment infrastructure.

Possible role:

- MentorRob is not a mascot, not a guide, and not the system's voice.
- He is a trusted community contact whose kindness is routed.
- He is the first proof that targeting can enter through care.
- On the witness side, he is not "the villain"; he is one node in a referral path.

Design sentence:

> MentorRob is the warm handoff. The Assistant is the system hand.

If MentorRob remains unclear, the mIRC scene needs stronger setup: why the user enters `#stillstruggling`, what "struggling" means in conversion-practice rhetoric, and how the channel appears to offer help while narrowing what help can mean.

### Typing and VR

Because typing in VR is hard, selected messages make sense.

Design implication:

- Browser may allow free typing for texture.
- VR should use selected message buttons or a small set of authored replies.
- Both versions should feed the same ledger categories: participation, disclosure, hesitation, acceptance, refusal, lateness, etc.
- The system should never pretend to semantically understand arbitrary free text if it does not.

### mIRC Narrative Hook

Sergio wants the "strugglers" logic better explored: the character/user may be seeking help, but the help-space uses conversion-practice language to persuade and trap.

Updated scene goal:

The mIRC beat should not merely be "queer chat invaded by MentorRob." It should be a narrative trap built from the language of help:

- The user enters because they want relief, language, or someone to talk to.
- The room's name and categories already frame queerness as struggle.
- The system does not need to attack; it offers the wrong map.
- The player "falls" because the room answers a real need.

This is stronger than a generic chatroom. It makes the first era about vocabulary capture: if the system names your feeling first, it controls the path of help.

### Assistant

Sergio asks how the Assistant could compete with the project.

Answer:

It competes only if it becomes the emotional protagonist or the narrator. It should instead be a recurring interface trend: cute at first because design trends were cute, then cleaner, then sterile, then agentic.

Updated Assistant rule:

- It may be cute when the era's design language is cute.
- It becomes more sterile as software design becomes more frictionless and automated.
- It guides interaction but does not explain the project.
- It must never become the player's friend in a way that replaces the human/persona stories.
- Its value is pattern recognition: the same help-shape keeps reappearing in new design clothes.

### Witness Side

Sergio's direction:

The other side should compile all user moves. It represents the system trying to label the user, build profiles, and propose more effective ways to target/trap them. It is a repository of the practitioners' harmful intentions, categories, frames, and tactics.

Updated rule:

> The witness side is not only "behind the scenes." It is the system's interpretive machine.

Everything there should answer:

- What did the player/person do?
- How did the system label it?
- What tactic does the system recommend next?
- Which practitioner/platform/community node receives the record?

### Respite / TransJesus

Sergio wants TransJesus as the first respite/countermedia idea.

Important revised direction:

- TransJesus is not simply a clean, protected livestream.
- It is corrupted/glitched with positive queer traits and flagged by moderators on the other side.
- The ex-gay/detrans documentary side should show comments pulling the user toward conversion narratives.
- The livestream/countermedia side shows how positive accepting content is flagged, moderated, distorted, or made illegible by platform systems.
- This helps explain how unregulated social platforms allow one narrative to dominate over affirming narratives.

Updated interpretation:

TransJesus is respite, but it is also evidence. The stream itself must remain a real site of queer energy, but the platform around it misreads and attacks it. The corruption should read as system violence/noise around the signal, not as queer joy being fake.

Design sentence:

> The stream survives; the platform stutters.

### Update Trigger

Sergio asks for options and analysis. See section A5 below.

### EULA

Sergio wants the EULA to use visual hierarchy:

- parts blurred out or harder to see;
- the user is pushed to read the bold parts;
- the design plays on the fact that people do not read terms and conditions;
- the burden should not be on the user to understand long documents;
- the system should protect people, not expect them to detect harm hidden in legal text.

Updated EULA rule:

> The EULA is not a reading test. It is a critique of responsibility transfer.

The player should feel the absurdity of being asked to consent to something intentionally unreadable.

### Dossier

Sergio wants the dossier voice to be both Witness and Researcher.

The cards are at the end. Earlier elements should create narrative, not full disclosure. Sources and links belong in the end material.

Updated dossier rule:

- During the experience: small narrative traces, labels, dossier unlocks, but not full exposition.
- End: fuller cards with sources, links, and research context.

### Sources

Sergio is building the knowledge base/archive and will confirm or debunk source candidates. Future agents should make lists of needed confirmations.

Updated rule:

> AI may prepare source candidates; Sergio verifies.

### Next Technical Priority

Sergio asks whether to start with the most resource-intensive part and notes that browser should be freely watchable/360 from the start.

Updated recommendation:

The next milestone should be the browser 360 room shell plus `?flat=1`, not Stage 2 content. Build the spatial container early because it changes the meaning of every scene.

The goal is not full XR polish yet. The goal is:

- browser camera in a 360-feeling room;
- drag/free-look;
- monitor remains the main UI;
- flip works in the room;
- `?flat=1` still works;
- one Era 1 soft-lo-fi room;
- one witness-side repository.

Full path remains the guiding development path. Festival path should be derived later, once logic is finalized.

## A2. How to Add More Without Making It Too Much

The project has many strong systems. The solution is not to remove them blindly. The solution is to assign each one a job inside a small number of repeating roles.

Recommended organizing model:

### 1. Targeting Loop

This is the main dramatic loop.

Pattern:

1. The person seeks something real: help, language, belonging, relief, music, community.
2. The interface offers a path.
3. The path extracts a little data.
4. The system reframes the person.
5. The witness side shows the harmful interpretation.

Systems that belong here:

- mIRC / `#stillstruggling`
- worksheet
- wellness app
- Pastor.AI
- search/autocomplete
- Offer
- EULA/update ritual
- Assistant, when it guides

Design discipline:

Only one targeting loop should dominate per stage.

### 2. Witness Repository

This is the compilation of moves and labels. It should become more elaborate over time.

Pattern:

1. Ledger field appears.
2. Human/practitioner/platform node interprets it.
3. Recommended next tactic appears.
4. The player cannot click it away.

Systems that belong here:

- intake record
- index card
- printer/manifest
- CRM dashboard
- moderation console
- ad-targeting/profile panel
- Assistant report view
- dossier metadata at the end

Design discipline:

The witness side should not become a lore museum. Every field should connect to something the player/person just did.

### 3. Countermedia / Respite

This is not a bonus. It is the affective survival layer.

Pattern:

1. The person finds a pocket of queer joy or counter-narrative.
2. The system cannot fully absorb it.
3. The witness side may flag it, but the content's meaning survives.
4. The end returns it as something the system did not own.

Systems that belong here:

- TransJesus livestream
- music/player as pleasure
- selected mini-games, only if they are not perpetrator-satire
- end archive/countermedia portal

Design discipline:

Respite should be lightly discoverable, not hidden. It should feel like a window the user can find, not a therapy break assigned by the artwork.

### 4. Optional Satirical Artifacts

These are the "maybe too much" pieces. They can exist if they are framed as in-world media, not as extra mechanics competing for attention.

Possible containment:

- Zap!/JUST CHANGE appears as an ad-game or pop-up lure, not a major game inside the game.
- SOGICEfy correction mechanic appears on the witness side or as a system copy of the user's music, while the user's side keeps music as pleasure.
- The Assistant appears at stage boundaries and operable surfaces, not during felt scenes.

Design discipline:

Each optional artifact must answer: does this show how the system recruits, labels, or fails? If not, park it.

## A3. Revised mIRC Concept: The Hook Is "Help"

The current mIRC scene should be rethought around Sergio's question: why is the user there?

Proposed structure:

### Front Side

The user/profile enters a channel or forum that seems to answer a real need. Its language should be conversion-coded but not absurd:

- `#stillstruggling`
- `#walking-it-out`
- `#unwanted-feelings`
- `#faith-and-identity`
- `#same-sex-attraction-support`

The hook is that the words are not random. They are the system's frame. A person who is scared or isolated may accept the frame because it is the first available language.

The chat should contain:

- real warmth;
- people trying to survive;
- one or two lines that gently normalize the conversion frame;
- MentorRob as the warm handoff.

### Witness Side

The same scene becomes:

- `source: self-selected support channel`
- `vulnerability: identity distress`
- `trusted contact: MentorRob`
- `recommended next step: private outreach`
- `risk: accepts struggle-frame`

This makes the trap visible without making the front side cartoonish.

### VR Input

Use authored reply chips instead of free typing:

- `I don't know what I am.`
- `I just need someone to talk to.`
- `My family would not understand.`
- `Maybe this is just a phase?`
- `Can people change?`
- `I should go.`

Each reply should be emotionally plausible. The system should classify all of them. Even `I should go` can become `resistant / follow-up later`.

## A4. Title Lab

Sergio still likes `Your Update Has Failed` but is open to smarter/subversive variants. He suggested:

> `Nothing to Update: Change Has Failed`

### Title Principles

The title should do three things:

1. Preserve the software/update metaphor.
2. Avoid implying the person failed.
3. Let the audience discover the moral reversal rather than explain it.

### Strong Candidates

#### `YOUR UPDATE HAS FAILED`

Pros:

- Direct, sharp, personal.
- Works beautifully as the system's final accusation.
- Strong double meaning: the attempted update of the person failed because the person was never broken.

Risks:

- Public-facing deficiency parse: "you failed to update."
- Needs context around it.

Best use:

- In-experience final line.
- Possibly public title if paired with a strong subtitle.

#### `NOTHING TO UPDATE`

Pros:

- Ethically clean.
- Elegant reversal.
- Immediately says the person was never broken.

Risks:

- Less sinister.
- Less like a software message.
- May sound more like a slogan than an experience title.

Best use:

- Subtitle, final dossier card, or end button language.

#### `CHANGE HAS FAILED`

Pros:

- Very clear historical critique.
- Conversion-practice claim collapses in the title.

Risks:

- "Change" can be too broad.
- Loses the software layer unless paired with update language.

Best use:

- Subtitle phrase.

#### `NOTHING TO UPDATE: CHANGE HAS FAILED`

Pros:

- Combines moral reversal with historical critique.
- Strong as an academic/program title.

Risks:

- A little declarative.
- It explains the thesis before the piece enacts it.

Best use:

- Subtitle or paper/exhibition text.

#### `THE UPDATE WILL FAIL`

Pros:

- Prophetic, tense, subversive.
- Suggests resistance before the system even starts.

Risks:

- Less grounded in the final "has failed" recognition.
- Sounds more like warning than aftermath.

Best use:

- Chapter title or poster variant.

#### `THE UPDATE HAS FAILED`

Pros:

- Removes the "you failed" risk.
- Keeps system failure foregrounded.

Risks:

- Less intimate.
- Loses some of Sergio's desired implication/proximity.

Best use:

- Public title if `YOUR` feels too risky.

### Recommended Title Architecture

Use a two-layer title, but not necessarily the `UPDATE AVAILABLE -> UPDATE FAILED` version:

- Public/title: `YOUR UPDATE HAS FAILED`
- Subtitle: `Nothing to update. Change has failed.`

This keeps Sergio's preferred title while protecting it with the reversal line.

Alternative:

- Public/title: `THE UPDATE HAS FAILED`
- In-experience final line: `Your update has failed.`
- Subtitle: `Nothing to update. Change has failed.`

This is safer but less personal.

## A5. Update Trigger Options: Analysis and Source Candidates

Sergio asked for options. These are not final citations. They are candidate anchors for Sergio to confirm, debunk, or replace in the knowledge base.

Important rule:

> Updates are triggered by system/practice failure, not player failure.

### Trigger 1: The Ex-Gay Collapse / Apology Event

Era use:

- Era 1 -> Era 2, or Era 2 -> Era 3 depending on timeline compression.

Narrative meaning:

The promise of "change" visibly fails, but the network does not disappear. It rebrands into support, management, or care language.

Possible in-world staging:

- A tiny news item crosses the desktop.
- A ministry bulletin says the old language is no longer supported.
- The update notification arrives immediately after the collapse.

Patch language:

- `"Cure" is deprecated.`
- `Introducing support for unwanted attractions.`
- `Your records have been migrated.`

Pros:

- Very close to the project's core thesis.
- Clear "failure -> rebrand" logic.
- Strong historical recognizability.

Risks:

- Real organizations/people must not be dramatized directly unless KB permits.
- Needs abstraction: "flagship ministry" rather than named character.

Source candidates to verify:

- Exodus International closed in 2013 after public apology/renunciation of conversion claims. Candidate secondary/overview source: Wikipedia summary includes closure date and apology context, but final project should use primary/archival sources where possible. [VERIFY SOURCE]
- AP/NPR/CBS/Washington Post/OWN archive may provide exact date/wording. [VERIFY SOURCE]

### Trigger 2: The Ban Wave / Malta 2016

Era use:

- Era 2 -> Era 3.

Narrative meaning:

Legal and professional condemnation makes old conversion language risky. The system updates into softer wellness/flourishing/community language.

Possible in-world staging:

- A forum admin post says some terms can no longer be used.
- The EULA buries a clause renaming therapy as support, mentoring, or flourishing.
- A patch note says: `Compliance update: outcomes language removed.`

Patch language:

- `Therapy module renamed.`
- `Outcomes language hidden.`
- `Flourishing tools installed.`

Pros:

- Strong legal/historical marker.
- European grounding.
- Lets the piece show regulation as partial pressure, not total victory.

Risks:

- Must avoid implying bans caused harm; the harm is the system evading accountability.
- Needs precise country/date/source confirmation.

Source candidates to verify:

- Malta became the first European country to ban conversion therapy in December 2016; multiple secondary sources report this, and the law should be verified against Maltese legislation records. [VERIFY SOURCE]
- Search official Maltese legal source for the Affirmation of Sexual Orientation, Gender Identity and Gender Expression Act / Act No. LV of 2016. [VERIFY SOURCE]

### Trigger 3: Platform Moderation / Narrative Capture

Era use:

- Era 3 -> Era 4.

Narrative meaning:

The conversion frame migrates into platform dynamics: recommendation, moderation asymmetry, influencer testimony, detrans/ex-gay documentary comments, AI/chatbot care, and "exploratory" language.

Possible in-world staging:

- A moderation dashboard flags affirming queer/trans joy as risky or unclassifiable.
- Comments under ex-gay/detrans content are boosted as "concerned support."
- TransJesus stream glitches because the platform cannot classify it cleanly.

Patch language:

- `A new conversation is available.`
- `Outcomes removed. Guidance preserved.`
- `Community safety filters updated.`

Pros:

- Connects directly to TransJesus and Stage 4.
- Lets the project critique social media systems without needing one villain.
- Makes "unregulated platforms construct one narrative over accepting ones" playable.

Risks:

- Needs careful evidence: platform moderation/recommendation claims can become broad fast.
- Must avoid suggesting queer joy itself is a trap.

Source candidates to verify:

- EU Fundamental Rights Agency 2024 LGBTIQ survey is cited in recent reporting as finding many LGBTQ+ respondents experienced conversion attempts. Find exact report table/wording. [VERIFY SOURCE]
- Need sources on platform recommender systems, anti-trans content ecosystems, and moderation asymmetry. [VERIFY SOURCE]

### Trigger 4: European Citizens' Initiative and Non-Binding Response

Era use:

- Close / "Last Update."

Narrative meaning:

Public resistance reaches scale, but legal response remains partial/non-binding. Hope exists as task, not completed world.

Possible in-world staging:

- End-screen version history shows `v5.0 — now installing...`
- Changelog line: `binding bans requested`
- Status line: `not yet installed`

Pros:

- Perfect for the ending's "reality plus task" structure.
- Gives the audience a concrete political present.
- Supports Sergio's desire for archive/future access later.

Risks:

- Current policy status changes quickly; must verify near release.
- Needs care not to overclaim EU legal effect.

Source candidates:

- Official European Citizens' Initiative page for "Ban on conversion practices in the European Union" registered 2024-01-24. [VERIFY SOURCE]
- Reporting says the initiative passed one million signatures in May 2025 and ended with about 1.245 million signatures; verify official ECI status. [VERIFY SOURCE]
- AP reported in May 2026 that the European Commission would urge member states to outlaw conversion practices after the citizen petition, while other reporting frames the response as non-binding/no EU-wide law. Verify exact Commission position before writing final text. [VERIFY SOURCE]

### Trigger 5: Backlash / Regression

Era use:

- Stage 4 and Close.

Narrative meaning:

The system updates again because the cultural/legal field becomes contested. Anti-trans rhetoric opens a new market and gives old tactics a new respectability.

Possible in-world staging:

- A feed shifts from "conversion" language to "concern," "watchful waiting," "debate," or "balanced exploration."
- The same funnel reappears as neutral care.

Patch language:

- `No outcomes favored.`
- `Exploration mode installed.`
- `Safeguarding vocabulary updated.`

Pros:

- Strongly connects to Stage 4.
- Explains why the piece cannot end with simple progress.

Risks:

- High ethical risk: must not satirize gender-exploratory clinical debate.
- Requires sources and Sergio approval.
- Must render both captions unresolved in felt/clinical scenes.

Source candidates:

- Need specific European/UK/US policy and clinical discourse sources depending on geography chosen. [VERIFY SOURCE]
- Avoid real-person dramatization.

### Trigger Recommendation

Use four triggers in the full path:

1. Ex-gay collapse/apology -> update from cure to support/management.
2. Ban/legal condemnation wave -> update into flourishing/wellness language.
3. Platform narrative capture -> update into AI/recommendation/moderation stage.
4. ECI/non-binding policy gap -> final "Last Update" as unresolved task.

This gives the experience a clean causal spine:

> exposed failure -> legal pressure -> platform migration -> public resistance without full installation.

## A6. TransJesus as First Respite/Countermedia Module

This deserves its own module because it can solve several design problems at once.

### What It Does

TransJesus provides:

- genuine queer/trans joy;
- a counter-narrative to ex-gay/detrans documentary content;
- a platform moderation critique;
- an emotional release valve;
- a recurring file that survives updates.

### How It Should Appear

Front side:

- A livestream window or file `transjesus.str`.
- It looks partially corrupted, but alive.
- The chat contains warmth, humor, music, presence, and affirmative language.
- The corruption is aesthetic evidence of platform/system pressure, not decay of the community.

Adjacent system content:

- Ex-gay/detrans documentary thumbnails/comments pull toward conversion logic.
- Concerned comments appear boosted, organized, or oddly repetitive.
- Affirming/positive content appears flagged, delayed, hidden, or labeled unclassifiable.

Witness side:

- `content type: unclassifiable`
- `moderation flag: positive identity reinforcement`
- `risk: counter-narrative exposure`
- `recommended action: redirect to testimony / concern content`

End:

- The stream or file returns cleaner.
- It is evidence that the system did not fully own the archive.

Critical rule:

> The platform attacks the stream. The stream does not betray the user.

## A7. Revised Next Milestone

Given Sergio's answer that browser should be free-watchable/360 from the start, the next milestone should be:

> Browser 360 room shell + flat fallback + witness repository grammar.

This is likely more resource-intensive than another 2D app, but it is foundational. It will determine how the whole piece feels.

Acceptance criteria:

- Browser default opens in a soft-lo-fi Era 1 room, framed on the monitor.
- Mouse/touch drag allows looking around the room.
- The monitor remains the only interactive UI surface.
- Flip turns to a witness-side repository/back-of-house.
- `?flat=1` renders the desktop canvas alone.
- Current mIRC slice still works.
- Witness side compiles actions into labels/recommended tactics.
- No new narrative disclosure is added.
- No code should pretend to understand free text beyond explicit selected/structured inputs.

Why this before Stage 2:

- It tests the core bodily/spatial grammar.
- It makes the browser version truly part of the one-room concept.
- It prevents later content from being designed as flat-only and then awkwardly spatialized.
- It gives Sergio something to feel and direct: warmth, distance, softness, witness sharpness.

## A8. Remaining Questions for Sergio

Only the still-live questions are listed here.

1. For public title, do you want to keep `YOUR UPDATE HAS FAILED` if paired with `Nothing to update. Change has failed.`?
2. Should the mIRC channel explicitly use conversion-coded terms like "same-sex attraction" / "struggling," or should those terms enter more subtly through replies and resources?
3. Should MentorRob be visibly older/mentor-coded, or should he first appear as just another user?
4. For selected VR replies, should the player choose emotionally honest messages, evasive messages, or a mix?
5. Should TransJesus first appear as a file, a pop-up, a livestream recommendation, or something another user shares?
6. Which update trigger should be prototyped first: ex-gay collapse, ban/legal pressure, platform moderation, or ECI/non-binding response?
7. What geography should anchor the legal/policy thread: Europe overall, Malta-to-EU, Norway/UiB context, UK, or a deliberately composite European route?
