STATUS: live

# Prompt for GPT: three mini-games for the 2026 console (replaces TIDY / ANTIVIRUS)
*His ruling, 2026-10-08: ANTIVIRUS "has interesting elements but not well conceptualised or even realised. Give me the
prompt and I'll send to GPT to make 3 different mini-games to run on the screen of the switch — let GPT think of ideas,
just give it the context." Everything below the line is the prompt, to be pasted as it is.*

---

I am making an interactive narrative artwork (a research piece at a university's centre for digital narrative) about how conversion-practice networks (often called "conversion therapy"; the research term is SOGICE, sexual orientation and gender identity change efforts) target queer people, and how those networks moved online across thirty years. The player sits in three rooms that age from 1997 to 2026. In each era, one small video game is lying in the room on a period handheld. **Each game is the conversion programme's own product**: cheerful, branded, a little ridiculous. The player plays it the way you would pick up a device lying on a bed.

**I need three different mini-game concepts for the 2026 device, each built as a playable prototype.** I will choose one. Please think freely about the ideas. Below is the context and the rules. The rules are not optional.

## The 2026 room and the person
- 2026 belongs to **Maya**, a trans woman in her twenties. Her friend is **Junie**. She goes to a queer social space in VR called **the Commons**.
- The apparatus in 2026 is not a pastor or a camp. It is software and feeds:
  - an AI assistant called **L**, from a wellness brand called **Second Thoughts**. L is warm, patient and never threatening. It "came with the update".
  - Its vocabulary is gentle. It talks about "exploring", "second thoughts", "keeping both files open, so nothing gets lost", and "you can always go back".
  - It quietly keeps a record of her under her old file.
  - It pushes articles about people who stopped transitioning.
  - It offers a photo "restoration" filter.
  - Its peers are cheerful accounts that push the same line.
- 2026 is not gentle in the wider world: open anti-trans campaigns and rising violence. The piece is direct about that and never cosy. But this game is the programme's soft, friendly product, so its surface is soft and friendly. The violence is in what the game asks, not in its graphics.

## The device
A modern hybrid handheld console lying on Maya's bed. It is a generic invented device, so no real brand, logo or likeness. It has:
- a bright 16:9 touch screen;
- a d-pad on the left;
- **A** and **B** buttons on the right;
- a **START** button.

Design every game for a **320 × 180 pixel** screen, drawn as **pixel art on a canvas** at integer scale.

## The rule that holds every game together (the "rhetoric of failure")
- **The programme's game cannot be won.** Its goal is the programme's goal: make her "simpler", "tidier" or "aligned", make her stop, get her back to the old file. That goal is impossible **by the rules of the game itself**, not because a caption says so. A score can approach 100% and never reach it; a box can refuse to stay shut; and so on.
- **The queer side always wins.** Whatever the player does, what belongs to Maya survives, completes or comes back. The best endings show it plainly. The player should feel this through their own hands, in play.
- **The link between the mechanic and the topic must be obvious within the first 10 seconds of play.** The last attempt failed on exactly this. It had interesting elements, but the concept was not legible in play and it was over-complicated. Prefer one strong verb the player repeats and that the game answers, over many systems.

## Hard rules
1. **Never make a queer person, or anything queer, the enemy, obstacle, target or thing to be destroyed.** Her things are never monsters and never "escape". The satire is only ever of the **seller**: the brand, its slogans, its mascot, its metrics. It must visibly collapse by the end.
2. **No real people, organisations, campaigns, logos or products.** Invent every name and mark. No named political campaigns on the game screen.
3. **No slurs.** No deadname: never invent or show an old name for Maya. "The old file" is as far as it goes.
4. **Do not mock the clinical debate** about gender-questioning young people. Do not satirise therapists or medicine. The target is the programme's product voice.
5. **Never gamify her pain, and never give the player a reward for erasing her.** If the game says "+10" for something cruel, the number itself must be the joke and must fail.
6. **Visually over-the-top.** Previous rounds were rejected for looking plain. Push it: garish wellness-app gradients, an overeager mascot, confetti that is a little too much, a jingle. Then let it break.
7. **Readable at a small size.** Use a clear pixel font at least 7 px tall (a 5×7 dot-matrix alphabet or bigger). Nothing smaller than that carries meaning. No paragraphs on screen: one short line at a time.
8. **Accessible input.** Every action works with touch alone and with the d-pad, A, B and START alone. No timing-critical inputs below about 0.3 s. Nothing flashes more than 3 times a second.
9. **Length:** one run is about 1½ to 3 minutes. It ends with an end card in the programme's voice, which then gives way to what survived.

## What the piece already has (please do not repeat these genres)
- 1997: a falling-block game where the programme's moulds never fit.
- 1997: a digging game where every memory you uncover gets a diagnosis.
- 2003: a marble-chain shooter (Zuma-like) where breaking the programme's words frees letters that spell the player's own sentence.
- 2016: a Flappy-Bird-like runner with a cheerful lamb mascot.

2026 should feel like **a 2026 game**: think of what a mobile or handheld game of 2026 looks like, its genres, its monetisation grammar and its daily-streak culture. Then let the programme use that grammar on Maya.

## Deliverables
For each of the three games:
- **A short concept** (under 150 words). It names the one verb, says what the programme wants, explains why that cannot happen by the rules, and says what the player understands by the end.
- **One self-contained HTML file.**
  - Code: no libraries, no network requests, no localStorage, cookies or any storage, no camera or microphone.
  - Screen: a 320 × 180 canvas scaled up crisply.
  - Sound: live Web Audio only, gentle, with M to mute.
  - Screens: a title screen with one how-to sentence, and the end card.
- **Colours:** at most 16, declared as named constants at the top of the file. I will remap them to the piece's palette.
- **All on-screen text** in one object at the top of the file, so it can be edited without touching the code.

Please start with the three concepts side by side and tell me which one you think is strongest and why. Then build all three.
