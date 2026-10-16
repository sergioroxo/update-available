STATUS: live

# Lamby guide — implementation and review, 2026-10-16

One programme guide follows the witness map across four skins, behind `?reinterp=1`. The pre-existing uncommitted opening/blocker changes were preserved. The requested `docs/reinterp/PROMPTS_CODEX_OPENING_2026-10-15.md` is absent in this checkout: the ruling was read from OPENING_NOTES G2 and the complete task supplied by the lead. CLAUDE.md was edited before implementation.

## Verification

- `npx tsc --noEmit` and `npm run build`: passed. Vite retains its large-chunk warning.
- `npm test`: passed, including the new pure state-machine tests (termination, five-balloon cap, requested help after the cap, protected answers, silence/voice gates, one-time form offer).
- `node tools/lamby-guide-probe.mjs 3221`: all ten 400×225 targeted checks passed with no page errors; evidence in `out/lamby-guide/probe-results.json`.
- Browser checks: idle tip → No thanks (dismissals = 1) → second line → one Start nudge → silence; Show me ring matches the real icon rect by 0–2px per edge; Take me there opens Restorify, without selecting a check-in response. Fifty consecutive frames have at most one guide balloon/frame helper/toast.
- The Family Form probe uses `irc.debugHook()` / `beginEscalation()` and the real `IRCApp.update()` loop until Rob’s turn files `rob-spoke-mother`. It does not assign `os.formAvailable` (a getter) or fabricate a second offer. `lg-take` opens `origin_intake_e1`; the form hides all guide controls; leaving it does not offer again.
- Silence probes use `debugJump("calebChat")` and a real testimony player state. Other gate checks and the pure tests cover quiet map beats, voice ownership and explicit silence.
- Setup was pressed through greet → wip → whose → sound → look → start → note → version → advert. Start opens/closes its demonstration; unset report text is absent. The human walker covers the mandatory film → allset (`balloon-10`).
- `node tools/walk.mjs --port 3221 --max 1400 --one-era`: passed, 161 real presses, reached e2 (2003). Evidence: `out/walks/WALK_2026-10-16_ONE_ERA.{json,md}`. No `lg-*` controls pressed.
- Screenshots at 1280×720 and 390×844, plus direct canvas exports, are under `out/lamby-guide/`. They were visually inspected against setup Lamblippy: shared tooltip border/tail/buttons, era paper/glass, visible target rings and all controls within their surfaces.

## Real targets and allowed acts

`target` lists are real published IDs, resolved only on the current surface; nothing is guessed. A missing/offscreen target produces no ring. Take me there is shown only for an available navigational press, a form open, or a conducted device action. Pledge, check-in, story topics, release, takes, consent, and L’s answer chips have no answer act.

| Era | Step | Real hit IDs / physical target | Allowed act |
|---|---|---|---|
| e1 | kit | `icon-a` | `press:icon-a` |
| e1 | read | `done`, `step:read`, `next` | `press:done` |
| e1 | pray | `play`, `step:pray` | `press:play` |
| e1 | pledge | `sign`, `pledge-notnow` | `— (visitor’s own press)` |
| e1 | connect | `connect`, `setup-next`, `step:connect` | `press:connect` |
| e1 | web | `web-join` | `press:web-join` |
| e1 | channel | `reply:0` | `— (visitor’s own press)` |
| e2 | checkin | `icon-restorify` | `press:icon-restorify` |
| e2 | story | `icon-story` | `press:icon-story` |
| e2 | release | `ts-agree` | `— (visitor’s own press)` |
| e2 | tapes | `ts-play`, `ts-file:daniel`, `ts-send` | `— (visitor’s own press)` |
| e2 | cut | none (informational) | `— (visitor’s own press)` |
| e2 | online | `ts-watch`, `ts-see` | `— (visitor’s own press)` |
| e2 | send | `icon-send` | `press:icon-send` |
| e3 | signin | `signin` | `press:signin` |
| e3 | consent | `consent-allow`, `consent-decline` | `— (visitor’s own press)` |
| e3 | work | `task-0` | `— (visitor’s own press)` |
| e3 | phone | phone stand → held phone | `move:phone` |
| e3 | vote | `link`, `link2` | `— (visitor’s own press)` |
| e4 | browser | `search-open` | `— (visitor’s own press)` |
| e4 | results | `search-open` | `press:search-open` |
| e4 | program | `result-agent`, `site-start`, `agent-begin` | `press:result-agent` |
| e4 | steps | `turn-0`, `turn-1` | `— (visitor’s own press)` |
| e4 | headset | desk headset | `move:headset` |
| e1 | form | no target rect; the existing `origin_intake_e1` app | `open:form` |

1997 targets were read in `kit.ts` (`done`, `next`, `step:read`, `play`, `step:pray`, `sign`, `pledge-notnow`, `connect`, `setup-next`, `step:connect`), `web1997.ts` (`web-join`) and `irc.ts` (`reply:0`, published in `replyRects`). 2003 uses `testimony.ts` (`ts-agree`, `ts-file:daniel`, `ts-play`, `ts-send`, `ts-see`, `ts-watch`) and OS desktop icons. 2016 uses GraceQueue’s `signin`, `task-0` and both `consent-*` rects. 2026’s first result is `result-agent` (s4_browser.json result ID `agent`), followed by `site-start` / `agent-begin`; there is no browser desktop icon, so the real search entry is `search-open`. The map aliases are `l → browser`, `search → results`, `site → program`.

**Movement correction discovered in the existing code:** the old phone node was retired in nodes.json; no headset movement node exists. `move:phone` reuses the current `noteSeat` + `holdDevice("phone", seat)` path; `move:headset` reuses `E4Shell.wear()`, exactly like the existing frame call. These are player-confirmed actions, never gaze triggers. The physical headset/phone targets and in-headset comfort remain unverified on hardware.

**Voice and memory:** the 1997 thread and 2003 conduction are retained. Its expanded side-message yields before Lamby, and its folded taskbar line is withheld while a guide balloon is visible. The desktop frame helper yields to Lamby, toasts, and felt windows; the immersive helper plate remains available. Lambient’s existing mark is reused and its assistant chime is removed: the guide has no sound. New witness strings describe only actual guide presses. Ledger reset generation clears guide memory without retaining the wiped ledger object.

The pointer prioritises data targets in order (Done before the booklet’s navigation). IRC uses its real `replyRects` registry. The 2016 tray uses a readable light label before the system tray; its lamb stays in the tray so neither consent control is covered. An inactive era publishes no guide controls. The second line can reach the final Start nudge after another data-defined idle interval even if it is left unanswered; it never starts another rung.

**Walker:** all `^lg-` controls are ignored through FORBIDDEN, including `lg-later` and `lg-x`; ordinary narrative controls advance the walk. Setup uses named steps, with the walker updated from the old About sequence to WIP/Start and from `balloon-9` to `balloon-10`.

## Needs the lead

- Supply `data/strings/setup.json` → `report`. It remains `[ADDRESS TO COME FROM THE LEAD]`; the entire report line is hidden while the value starts with `[`. The complete specified WIP message, including Esc/reload recovery, is shown.
- Physical headset and phone review: conducted phone pickup, headset wear, and comfort/legibility. No claim of Quest or phone hardware validation is made.

## Numbered BEFORE / AFTER string record

Unchanged content is not rewritten: supplied guide drafts are verbatim; About paragraphs move verbatim; `home.json return.plaque`, entrance WIP, `[VERIFY SOURCE]`, and setup clock code stay untouched. This inventory includes new target/action strings as well as display text.

1. **CLAUDE.md R28 §2** — the complete edit:

```diff
diff --git a/CLAUDE.md b/CLAUDE.md
index b3057f83..2c2d06ca 100644
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -20,13 +20,19 @@ Plan of record: `docs/REINTERP_RESTRUCTURE_R28_2026-07-10.md`.
    no beat is triggered by a look: where the story needs them to see something, the piece TAKES them there (a
    scripted send, a conducted turn, a device brought to the eye), as a sequence of actions. Looking around stays
    free; it is never required. (Cadence study §9, docs/reinterp/CADENCE_STUDY_2026-10-10.md.)
-2. **Guidance (revises the Assistant caps):** Era 1 has NO assistant
-   character — only impersonal system side-messages (short hints that help
-   navigate and PREPARE the user for Lamby). The Lamby character-conductor
-   debuts with the Era-2 update and conducts thereafter, ≤2 lines per
-   conduction beat. Unchanged and non-negotiable: never during `felt` scenes,
+2. **Guidance (revised by Sérgio, 2026-10-15):** "We need to reinstate Lamby as the connection point of the correction and forcing you to do stuff."
+   Lamby is ONE guide with four era skins, from 1997: just-in-time hints when
+   the visitor stalls, a balloon with Yes/No, a pointer and an offer to take
+   them to the thing to press. Always ignorable; exploration stays free.
+   This supersedes "Era 1 has NO assistant character". Era 1's impersonal
+   side-messages stay; Era 2's conduction stays (≤2 lines per conduction beat).
+   ≤5 unsolicited guide balloons per era; visitor-requested help is uncapped.
+   One voice at a time: side-messages, conduction, toasts and guide wait for
+   one another; the desktop frame helper yields to Lamby's balloon.
+   Unchanged and non-negotiable: never during `felt` or `respite` scenes,
    never jokes at the victim, never delivers Dossier text, dismissal always
-   works and is logged.
+   works and is logged. Memory only; no sound. See
+   `docs/reinterp/OPENING_NOTES_2026-10-15.md` G2.
 3. **Input (revises "click/tap only"):** click/tap + the movement press
    (above) + Esc/pause opening the game menu. Still no free-text keyboard, no
    timers, no chords. ⚑ **S80: a tap is now resolved on RELEASE, behind a
```

2. **1997/2003 taskbar label (os.ts → slice.json desktop.startMenu.button)**
   - BEFORE: "MENU"
   - AFTER: "Start"

3. **setup.icons: About icon**
   - BEFORE: "About this project"
   - AFTER: (removed)

4. **setup.balloons[1] → balloons.wip.text**
   - BEFORE: "Want to know what this place is?"
   - AFTER: "Quick heads-up: I'm still being finished! If something gets stuck, press Esc for the menu, or reload the page."

5. **setup.balloons[1].buttons → balloons.wip.buttons**
   - BEFORE: ["Show me", "Later"]
   - AFTER: ["Got it"]

6. **setup.report**
   - BEFORE: (absent)
   - AFTER: "[ADDRESS TO COME FROM THE LEAD]"

7. **setup.reportLine**
   - BEFORE: (absent)
   - AFTER: "Found a problem? Tell us: {report}"

8. **setup.balloons.start.text**
   - BEFORE: (absent)
   - AFTER: "This is the Start button. Press it any time to see what to do next, and what's on the desktop. Try it!"

9. **setup.balloons.start.buttons**
   - BEFORE: (absent)
   - AFTER: ["Show me", "Later"]

10. **setup.startTried.text**
   - BEFORE: (absent)
   - AFTER: "That's it. Everything you can do is in there."

11. **setup.startTried.buttons**
   - BEFORE: (absent)
   - AFTER: ["Got it"]

12. **About title: setup.about.title → about.title + Credits first row**
   - BEFORE: "About this project"
   - AFTER: "About this project"

13. **About paragraphs: setup.about.paragraphs → about.paragraphs[0]**
   - BEFORE: "This is a piece about how organised “conversion” networks (SOGICE) targeted queer people online, from 1997 to 2026. Four updates, thirty years: none of them changed who anyone was."
   - AFTER: "This is a piece about how organised “conversion” networks (SOGICE) targeted queer people online, from 1997 to 2026. Four updates, thirty years: none of them changed who anyone was."

14. **About paragraphs: setup.about.paragraphs → about.paragraphs[1]**
   - BEFORE: "It is part of SurvivingSOGICE, a research project at the University of Bergen's Center for Digital Narrative. Everything in it rests on that research: at the end you will find a Library with the Lexicon — the words these networks used and the reasons they gave — and the full list of sources is in the menu, under Credits & attributions."
   - AFTER: "It is part of SurvivingSOGICE, a research project at the University of Bergen's Center for Digital Narrative. Everything in it rests on that research: at the end you will find a Library with the Lexicon — the words these networks used and the reasons they gave — and the full list of sources is in the menu, under Credits & attributions."

15. **About paragraphs: setup.about.paragraphs → about.paragraphs[2]**
   - BEFORE: "It was directed by the project, and written and built in collaboration with Claude (Anthropic)."
   - AFTER: "It was directed by the project, and written and built in collaboration with Claude (Anthropic)."

16. **About paragraphs: setup.about.paragraphs → about.paragraphs[3]**
   - BEFORE: "More to be added soon."
   - AFTER: "More to be added soon."

17. **Removed setup About browser chrome: toolbar**
   - BEFORE: ["Back", "Forward", "Reload", "Home", "Search", "Print"]
   - AFTER: (removed)

18. **Removed setup About browser chrome: location**
   - BEFORE: "Location:"
   - AFTER: (removed)

19. **Removed setup About browser chrome: address**
   - BEFORE: "lambyos://about"
   - AFTER: (removed)

20. **Removed setup About browser chrome: status**
   - BEFORE: "Document: Done"
   - AFTER: (removed)

21. **lambyGuide.ui.show**
   - BEFORE: (absent)
   - AFTER: "Show me"

22. **lambyGuide.ui.later**
   - BEFORE: (absent)
   - AFTER: "No thanks"

23. **lambyGuide.ui.take**
   - BEFORE: (absent)
   - AFTER: "Take me there"

24. **lambyGuide.ui.ok**
   - BEFORE: (absent)
   - AFTER: "Got it"

25. **lambyGuide.ui.tray**
   - BEFORE: (absent)
   - AFTER: "Lamby"

26. **lambyGuide.ui.trayTip**
   - BEFORE: (absent)
   - AFTER: "Need a hand? Press me."

27. **lambyGuide.ui.here**
   - BEFORE: (absent)
   - AFTER: "It's right here!"

28. **lambyGuide.ui.nothing**
   - BEFORE: (absent)
   - AFTER: "You're doing fine. Carry on!"

29. **lambyGuide.ui.startNudge**
   - BEFORE: (absent)
   - AFTER: "Have you checked the Start menu?"

30. **lambyGuide.ui.close**
   - BEFORE: (absent)
   - AFTER: "×"

31. **lambyGuide.form.text**
   - BEFORE: (absent)
   - AFTER: "Rob mentioned the Family Form! Want me to open the form for you?"

32. **lambyGuide.form.yes**
   - BEFORE: (absent)
   - AFTER: "Open it"

33. **lambyGuide.form.no**
   - BEFORE: (absent)
   - AFTER: "No thanks"

34. **lambyGuide.form.act**
   - BEFORE: (absent)
   - AFTER: "open:form"

35. **lambyGuide.witness.dismissed**
   - BEFORE: (absent)
   - AFTER: "guide declined: {beat}"

36. **lambyGuide.witness.begun**
   - BEFORE: (absent)
   - AFTER: "guide requested: {beat}"

37. **lambyGuide.witness.acknowledged**
   - BEFORE: (absent)
   - AFTER: "guide acknowledged: {beat}"

38. **lambyGuide.eras.e1.kit.tip**
   - BEFORE: (absent)
   - AFTER: "There's a disk on your desktop! Press the A:\\ icon to start."

39. **lambyGuide.eras.e1.kit.here**
   - BEFORE: (absent)
   - AFTER: "That's the one. The A:\\ icon."

40. **lambyGuide.eras.e1.kit.again**
   - BEFORE: (absent)
   - AFTER: "The disk is still waiting. Shall I point to it?"

41. **lambyGuide.eras.e1.kit.target[0]**
   - BEFORE: (absent)
   - AFTER: "icon-a"

42. **lambyGuide.eras.e1.kit.act**
   - BEFORE: (absent)
   - AFTER: "press:icon-a"

43. **lambyGuide.eras.e1.read.tip**
   - BEFORE: (absent)
   - AFTER: "Read the programme, then press Done."

44. **lambyGuide.eras.e1.read.here**
   - BEFORE: (absent)
   - AFTER: "Done is at the bottom of the window."

45. **lambyGuide.eras.e1.read.again**
   - BEFORE: (absent)
   - AFTER: "Take your time. When you've read it, press Done."

46. **lambyGuide.eras.e1.read.target[0]**
   - BEFORE: (absent)
   - AFTER: "done"

47. **lambyGuide.eras.e1.read.target[1]**
   - BEFORE: (absent)
   - AFTER: "step:read"

48. **lambyGuide.eras.e1.read.target[2]**
   - BEFORE: (absent)
   - AFTER: "next"

49. **lambyGuide.eras.e1.read.act**
   - BEFORE: (absent)
   - AFTER: "press:done"

50. **lambyGuide.eras.e1.pray.tip**
   - BEFORE: (absent)
   - AFTER: "Next is the tape. Press Play and follow the words."

51. **lambyGuide.eras.e1.pray.here**
   - BEFORE: (absent)
   - AFTER: "Play is right here."

52. **lambyGuide.eras.e1.pray.again**
   - BEFORE: (absent)
   - AFTER: "The words stay on screen. You can start whenever you like."

53. **lambyGuide.eras.e1.pray.target[0]**
   - BEFORE: (absent)
   - AFTER: "play"

54. **lambyGuide.eras.e1.pray.target[1]**
   - BEFORE: (absent)
   - AFTER: "step:pray"

55. **lambyGuide.eras.e1.pray.act**
   - BEFORE: (absent)
   - AFTER: "press:play"

56. **lambyGuide.eras.e1.pledge.tip**
   - BEFORE: (absent)
   - AFTER: "A pledge card! Sign it, or set it aside — either way you can go on."

57. **lambyGuide.eras.e1.pledge.here**
   - BEFORE: (absent)
   - AFTER: "Sign it here, or set it aside."

58. **lambyGuide.eras.e1.pledge.again**
   - BEFORE: (absent)
   - AFTER: "Not sure? Setting it aside is fine."

59. **lambyGuide.eras.e1.pledge.target[0]**
   - BEFORE: (absent)
   - AFTER: "sign"

60. **lambyGuide.eras.e1.pledge.target[1]**
   - BEFORE: (absent)
   - AFTER: "pledge-notnow"

61. **lambyGuide.eras.e1.connect.tip**
   - BEFORE: (absent)
   - AFTER: "Now we go online. Press Connect and the wizard will dial."

62. **lambyGuide.eras.e1.connect.here**
   - BEFORE: (absent)
   - AFTER: "Connect is the big button."

63. **lambyGuide.eras.e1.connect.again**
   - BEFORE: (absent)
   - AFTER: "The wizard is ready when you are."

64. **lambyGuide.eras.e1.connect.target[0]**
   - BEFORE: (absent)
   - AFTER: "connect"

65. **lambyGuide.eras.e1.connect.target[1]**
   - BEFORE: (absent)
   - AFTER: "setup-next"

66. **lambyGuide.eras.e1.connect.target[2]**
   - BEFORE: (absent)
   - AFTER: "step:connect"

67. **lambyGuide.eras.e1.connect.act**
   - BEFORE: (absent)
   - AFTER: "press:connect"

68. **lambyGuide.eras.e1.web.tip**
   - BEFORE: (absent)
   - AFTER: "This is the fellowship's page. Press Join to go to the channel."

69. **lambyGuide.eras.e1.web.here**
   - BEFORE: (absent)
   - AFTER: "Join is right here."

70. **lambyGuide.eras.e1.web.again**
   - BEFORE: (absent)
   - AFTER: "Look around first if you like. Join will still be here."

71. **lambyGuide.eras.e1.web.target[0]**
   - BEFORE: (absent)
   - AFTER: "web-join"

72. **lambyGuide.eras.e1.web.act**
   - BEFORE: (absent)
   - AFTER: "press:web-join"

73. **lambyGuide.eras.e1.channel.tip**
   - BEFORE: (absent)
   - AFTER: "The chat is waiting. Press the line at the bottom to answer."

74. **lambyGuide.eras.e1.channel.here**
   - BEFORE: (absent)
   - AFTER: "That's your answer line."

75. **lambyGuide.eras.e1.channel.again**
   - BEFORE: (absent)
   - AFTER: "Or just read on — the chat moves by itself."

76. **lambyGuide.eras.e1.channel.target[0]**
   - BEFORE: (absent)
   - AFTER: "reply:0"

77. **lambyGuide.eras.e2.checkin.tip**
   - BEFORE: (absent)
   - AFTER: "Restorify's daily check-in is on the desktop. Press the Restorify icon."

78. **lambyGuide.eras.e2.checkin.here**
   - BEFORE: (absent)
   - AFTER: "It's the icon in the top corner."

79. **lambyGuide.eras.e2.checkin.again**
   - BEFORE: (absent)
   - AFTER: "A tick or two is all it takes."

80. **lambyGuide.eras.e2.checkin.target[0]**
   - BEFORE: (absent)
   - AFTER: "icon-restorify"

81. **lambyGuide.eras.e2.checkin.act**
   - BEFORE: (absent)
   - AFTER: "press:icon-restorify"

82. **lambyGuide.eras.e2.story.tip**
   - BEFORE: (absent)
   - AFTER: "There's a new video waiting: Your Story. Press it to begin."

83. **lambyGuide.eras.e2.story.here**
   - BEFORE: (absent)
   - AFTER: "Your Story is the icon with the little dot."

84. **lambyGuide.eras.e2.story.again**
   - BEFORE: (absent)
   - AFTER: "Your Story is waiting. Shall I point?"

85. **lambyGuide.eras.e2.story.target[0]**
   - BEFORE: (absent)
   - AFTER: "icon-story"

86. **lambyGuide.eras.e2.story.act**
   - BEFORE: (absent)
   - AFTER: "press:icon-story"

87. **lambyGuide.eras.e2.release.tip**
   - BEFORE: (absent)
   - AFTER: "Nearly there! Read the release, then press Agree."

88. **lambyGuide.eras.e2.release.here**
   - BEFORE: (absent)
   - AFTER: "Agree is at the bottom."

89. **lambyGuide.eras.e2.release.again**
   - BEFORE: (absent)
   - AFTER: "The release is already filled in for you."

90. **lambyGuide.eras.e2.release.target[0]**
   - BEFORE: (absent)
   - AFTER: "ts-agree"

91. **lambyGuide.eras.e2.tapes.tip**
   - BEFORE: (absent)
   - AFTER: "Play your take through to the end, then send it to editing."

92. **lambyGuide.eras.e2.tapes.here**
   - BEFORE: (absent)
   - AFTER: "Play is here. Editing is the next button."

93. **lambyGuide.eras.e2.tapes.again**
   - BEFORE: (absent)
   - AFTER: "I'll wait. Press Play when you're ready."

94. **lambyGuide.eras.e2.tapes.target[0]**
   - BEFORE: (absent)
   - AFTER: "ts-play"

95. **lambyGuide.eras.e2.tapes.target[1]**
   - BEFORE: (absent)
   - AFTER: "ts-file:daniel"

96. **lambyGuide.eras.e2.tapes.target[2]**
   - BEFORE: (absent)
   - AFTER: "ts-send"

97. **lambyGuide.eras.e2.cut.tip**
   - BEFORE: (absent)
   - AFTER: "The programme is cutting your story. Sit tight!"

98. **lambyGuide.eras.e2.online.tip**
   - BEFORE: (absent)
   - AFTER: "Your story is ready. Press Watch to see it online."

99. **lambyGuide.eras.e2.online.here**
   - BEFORE: (absent)
   - AFTER: "Watch is here."

100. **lambyGuide.eras.e2.online.again**
   - BEFORE: (absent)
   - AFTER: "Your story is waiting for you."

101. **lambyGuide.eras.e2.online.target[0]**
   - BEFORE: (absent)
   - AFTER: "ts-watch"

102. **lambyGuide.eras.e2.online.target[1]**
   - BEFORE: (absent)
   - AFTER: "ts-see"

103. **lambyGuide.eras.e2.send.tip**
   - BEFORE: (absent)
   - AFTER: "You have a summons. Press the envelope on the desktop."

104. **lambyGuide.eras.e2.send.here**
   - BEFORE: (absent)
   - AFTER: "The envelope is on the left."

105. **lambyGuide.eras.e2.send.again**
   - BEFORE: (absent)
   - AFTER: "It won't take long. The envelope is on the left."

106. **lambyGuide.eras.e2.send.target[0]**
   - BEFORE: (absent)
   - AFTER: "icon-send"

107. **lambyGuide.eras.e2.send.act**
   - BEFORE: (absent)
   - AFTER: "press:icon-send"

108. **lambyGuide.eras.e3.signin.tip**
   - BEFORE: (absent)
   - AFTER: "Welcome to GracePlatform! Press Sign in to begin your first shift."

109. **lambyGuide.eras.e3.signin.here**
   - BEFORE: (absent)
   - AFTER: "Sign in is right here."

110. **lambyGuide.eras.e3.signin.again**
   - BEFORE: (absent)
   - AFTER: "Your shift starts when you sign in."

111. **lambyGuide.eras.e3.signin.target[0]**
   - BEFORE: (absent)
   - AFTER: "signin"

112. **lambyGuide.eras.e3.signin.act**
   - BEFORE: (absent)
   - AFTER: "press:signin"

113. **lambyGuide.eras.e3.consent.tip**
   - BEFORE: (absent)
   - AFTER: "Lambient has a quick question. Answer it and we're off."

114. **lambyGuide.eras.e3.consent.here**
   - BEFORE: (absent)
   - AFTER: "Your answer goes here."

115. **lambyGuide.eras.e3.consent.again**
   - BEFORE: (absent)
   - AFTER: "Either answer works — Lambient carries on."

116. **lambyGuide.eras.e3.consent.target[0]**
   - BEFORE: (absent)
   - AFTER: "consent-allow"

117. **lambyGuide.eras.e3.consent.target[1]**
   - BEFORE: (absent)
   - AFTER: "consent-decline"

118. **lambyGuide.eras.e3.work.tip**
   - BEFORE: (absent)
   - AFTER: "Pick a card on the board and work it through to the end."

119. **lambyGuide.eras.e3.work.here**
   - BEFORE: (absent)
   - AFTER: "Any card will do. Start with the first."

120. **lambyGuide.eras.e3.work.again**
   - BEFORE: (absent)
   - AFTER: "One card at a time. The first one is fine."

121. **lambyGuide.eras.e3.work.target[0]**
   - BEFORE: (absent)
   - AFTER: "task-0"

122. **lambyGuide.eras.e3.phone.tip**
   - BEFORE: (absent)
   - AFTER: "Your phone has a message. Pick it up from its stand."

123. **lambyGuide.eras.e3.phone.here**
   - BEFORE: (absent)
   - AFTER: "It's on its stand, to your left."

124. **lambyGuide.eras.e3.phone.again**
   - BEFORE: (absent)
   - AFTER: "Shall I take you to the phone?"

125. **lambyGuide.eras.e3.phone.act**
   - BEFORE: (absent)
   - AFTER: "move:phone"

126. **lambyGuide.eras.e3.vote.tip**
   - BEFORE: (absent)
   - AFTER: "The group sent a link. Open it when you're ready."

127. **lambyGuide.eras.e3.vote.here**
   - BEFORE: (absent)
   - AFTER: "The link is on the phone."

128. **lambyGuide.eras.e3.vote.again**
   - BEFORE: (absent)
   - AFTER: "The link is waiting."

129. **lambyGuide.eras.e3.vote.target[0]**
   - BEFORE: (absent)
   - AFTER: "link"

130. **lambyGuide.eras.e3.vote.target[1]**
   - BEFORE: (absent)
   - AFTER: "link2"

131. **lambyGuide.eras.e4.browser.tip**
   - BEFORE: (absent)
   - AFTER: "Your session is back. Press the browser to look around."

132. **lambyGuide.eras.e4.browser.here**
   - BEFORE: (absent)
   - AFTER: "The browser is on your desktop."

133. **lambyGuide.eras.e4.browser.again**
   - BEFORE: (absent)
   - AFTER: "Your session is waiting in the browser."

134. **lambyGuide.eras.e4.browser.target[0]**
   - BEFORE: (absent)
   - AFTER: "search-open"

135. **lambyGuide.eras.e4.results.tip**
   - BEFORE: (absent)
   - AFTER: "Press Search and let the engine finish it."

136. **lambyGuide.eras.e4.results.here**
   - BEFORE: (absent)
   - AFTER: "Search is right here."

137. **lambyGuide.eras.e4.results.again**
   - BEFORE: (absent)
   - AFTER: "It finishes by itself. You only press once."

138. **lambyGuide.eras.e4.results.target[0]**
   - BEFORE: (absent)
   - AFTER: "search-open"

139. **lambyGuide.eras.e4.results.act**
   - BEFORE: (absent)
   - AFTER: "press:search-open"

140. **lambyGuide.eras.e4.program.tip**
   - BEFORE: (absent)
   - AFTER: "Open the first result to begin."

141. **lambyGuide.eras.e4.program.here**
   - BEFORE: (absent)
   - AFTER: "That's the first result."

142. **lambyGuide.eras.e4.program.again**
   - BEFORE: (absent)
   - AFTER: "The first result is the one to open."

143. **lambyGuide.eras.e4.program.target[0]**
   - BEFORE: (absent)
   - AFTER: "result-agent"

144. **lambyGuide.eras.e4.program.target[1]**
   - BEFORE: (absent)
   - AFTER: "site-start"

145. **lambyGuide.eras.e4.program.target[2]**
   - BEFORE: (absent)
   - AFTER: "agent-begin"

146. **lambyGuide.eras.e4.program.act**
   - BEFORE: (absent)
   - AFTER: "press:result-agent"

147. **lambyGuide.eras.e4.steps.tip**
   - BEFORE: (absent)
   - AFTER: "L has a question. Answer it one step at a time."

148. **lambyGuide.eras.e4.steps.here**
   - BEFORE: (absent)
   - AFTER: "Your answer goes here."

149. **lambyGuide.eras.e4.steps.again**
   - BEFORE: (absent)
   - AFTER: "One step, then the next."

150. **lambyGuide.eras.e4.steps.target[0]**
   - BEFORE: (absent)
   - AFTER: "turn-0"

151. **lambyGuide.eras.e4.steps.target[1]**
   - BEFORE: (absent)
   - AFTER: "turn-1"

152. **lambyGuide.eras.e4.headset.tip**
   - BEFORE: (absent)
   - AFTER: "Time for the headset. It's on the desk — shall I take you there?"

153. **lambyGuide.eras.e4.headset.here**
   - BEFORE: (absent)
   - AFTER: "It's on the desk."

154. **lambyGuide.eras.e4.headset.again**
   - BEFORE: (absent)
   - AFTER: "Shall I take you to the headset?"

155. **lambyGuide.eras.e4.headset.act**
   - BEFORE: (absent)
   - AFTER: "move:headset"

## Timing (data, not display copy)

{"cueSeconds": 25, "tipSeconds": 50, "againSeconds": 90, "capPerEra": 5}

Balloon thresholds use the same idleScale as the frame helper (1× coarse input/XR; 1.8× desktop mouse; review `idlescale / 60`). Any press, drag, wheel or key resets the clock. A pending second-line wait keeps the desktop saver from swallowing it. After the final nudge the guide is silent for the step.

## Screenshot index

- e1-pointer: [1280×720](/Users/sergiogalvaoroxo/update-available-reinterp/out/lamby-guide/e1-pointer-1280x720.png) · [390×844](/Users/sergiogalvaoroxo/update-available-reinterp/out/lamby-guide/e1-pointer-390x844.png)
- e2-pointer: [1280×720](/Users/sergiogalvaoroxo/update-available-reinterp/out/lamby-guide/e2-pointer-1280x720.png) · [390×844](/Users/sergiogalvaoroxo/update-available-reinterp/out/lamby-guide/e2-pointer-390x844.png)
- e3-card: [1280×720](/Users/sergiogalvaoroxo/update-available-reinterp/out/lamby-guide/e3-card-1280x720.png) · [390×844](/Users/sergiogalvaoroxo/update-available-reinterp/out/lamby-guide/e3-card-390x844.png)
- e4-card: [1280×720](/Users/sergiogalvaoroxo/update-available-reinterp/out/lamby-guide/e4-card-1280x720.png) · [390×844](/Users/sergiogalvaoroxo/update-available-reinterp/out/lamby-guide/e4-card-390x844.png)
- setup-wip: [1280×720](/Users/sergiogalvaoroxo/update-available-reinterp/out/lamby-guide/setup-wip-1280x720.png) · [390×844](/Users/sergiogalvaoroxo/update-available-reinterp/out/lamby-guide/setup-wip-390x844.png)
- setup-start: [1280×720](/Users/sergiogalvaoroxo/update-available-reinterp/out/lamby-guide/setup-start-1280x720.png) · [390×844](/Users/sergiogalvaoroxo/update-available-reinterp/out/lamby-guide/setup-start-390x844.png)
- credits-about-row: [1280×720](/Users/sergiogalvaoroxo/update-available-reinterp/out/lamby-guide/credits-about-row-1280x720.png) · [390×844](/Users/sergiogalvaoroxo/update-available-reinterp/out/lamby-guide/credits-about-row-390x844.png)
- about-project: [1280×720](/Users/sergiogalvaoroxo/update-available-reinterp/out/lamby-guide/about-project-1280x720.png) · [390×844](/Users/sergiogalvaoroxo/update-available-reinterp/out/lamby-guide/about-project-390x844.png)
