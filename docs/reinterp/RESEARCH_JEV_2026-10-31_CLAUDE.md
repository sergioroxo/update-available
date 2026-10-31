STATUS: live

*Written by a Claude Haiku 5.5 agent (31 Oct). Two runs of the same prompt wrote to one path; the other version is `RESEARCH_JEV_2026-10-31.md` (his GPT run). Both kept; DESIGN_MISSING_YEARS_2026-10-31.md reads both.*

# Jev (TypeSafe AI): what it is, and does it fit the walker?

Written 31 October 2026, for the project lead.
Nothing was signed up for, installed, or called. Every fact below comes from a web page. Each one has its link.

---

## The short version

- Jev is not a chatbot. It answers typed questions with a label or a number. It writes no words.
- It is very cheap and fast. Input costs about $0.04 per million tokens. Output is free.
- It cannot explain its answers.
- I found no one using Jev for browser automation, UI testing, or screenshot judging. The evidence is thin.
- Best fit for us: picking the right project document from a list (d). Also worth one small experiment as a walker fallback (a).
- Weak fit: judging screenshots (b), and ranking narrative branches (c).

---

## 1. What Jev is

**Who and when.** TypeSafe AI announced Jev on 15 September 2026. It is in early access. ([DataCamp](https://www.datacamp.com/blog/system-one-models-jev); [The Register](https://www.theregister.com/a/5298431)) The launch blog says access is by waitlist. ([TypeSafe blog](https://typesafe.ai/blog/introducing-system-one-models-and-jev)) The OpenRouter guide says you only need an OpenRouter key. ([OpenRouter Jev guide](https://openrouter.ai/docs/guides/community/jev.md))

**The four question types.** The launch blog does not name them. The docs do.

- **Choice.** Picks one option from a fixed list. Up to 255 options. ([Choice](https://docs.typesafe.ai/primitives/choice))
- **Score.** Places the input on an ordered scale of 2 to 10 levels. ([Score](https://docs.typesafe.ai/primitives/score))
- **Noul.** The fourth type. Asks a yes or no question and returns a number from 0 to 1. ([Noul](https://docs.typesafe.ai/primitives/noul))
- **Box.** Finds a described thing in an image. Returns four edges as fractions of the picture. Still a preview. It needs the newest model, jev-1.14. ([Box](https://docs.typesafe.ai/go/box))

**Image input.** This has changed since launch.

- The launch blog said images were not supported. ([TypeSafe blog](https://typesafe.ai/blog/introducing-system-one-models-and-jev))
- The OpenRouter guide now says images work, as an early feature. ([OpenRouter Jev guide](https://openrouter.ai/docs/guides/community/jev.md))
- Only PNG and JPEG files are accepted. ([Multimodal guide](https://openrouter.ai/docs/guides/community/multimodal-decisions.md))
- Each side must be 256 to 1,568 pixels. Each file can be up to 16 MiB. The whole request can be up to 32 MiB. ([Multimodal guide](https://openrouter.ai/docs/guides/community/multimodal-decisions.md))
- Every request with an image runs in "long-context mode." ([OpenRouter Jev guide](https://openrouter.ai/docs/guides/community/jev.md))

**Limits.**

- Choice: up to 255 options. ([Choice](https://docs.typesafe.ai/primitives/choice))
- Score: 2 to 10 levels. ([Score](https://docs.typesafe.ai/primitives/score))
- Box: one target per question. ([Box](https://docs.typesafe.ai/go/box))
- Context window: 262,144 tokens, according to the OpenRouter guide. ([OpenRouter Jev guide](https://openrouter.ai/docs/guides/community/jev.md))
- **Conflict:** a price page says the window is 32,000 tokens for an older version, jev-1.13.0. ([eesel](https://www.eesel.ai/blog/typesafe-jev-pricing)) I could not open the official model page to settle it. Check it before relying on either number.
- **Long-context mode** runs when text is over about 32,000 bytes, or when there is any image. TypeSafe says it is slower and less accurate. It gives no numbers. ([OpenRouter Jev guide](https://openrouter.ai/docs/guides/community/jev.md))

**Speed.**

- The blog claims 70 to 500 milliseconds end to end. ([TypeSafe blog](https://typesafe.ai/blog/introducing-system-one-models-and-jev))
- In TypeSafe's own four-workflow test, Jev averaged 0.4 seconds. The LLMs it tested took 10 to 38 seconds. ([DataCamp](https://www.datacamp.com/blog/system-one-models-jev))
- One clothing app measured about 620 milliseconds per decision. ([The Register](https://www.theregister.com/a/5298431))

**Price.**

- Input: $0.042 per million tokens. Output: free. ([DataCamp](https://www.datacamp.com/blog/system-one-models-jev); [eesel](https://www.eesel.ai/blog/typesafe-jev-pricing))
- The API reference example bills 476 input tokens at $0.000019992. That matches this rate exactly. ([API reference](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request.md))
- The OpenRouter model page would not open, so I could not read its own price box.

**Accuracy.** This is TypeSafe's own test, not an independent one. Jev scored 67.8%. GPT-5.6 Sol scored 74.1%. Claude Opus 5 scored 73.1%. ([DataCamp](https://www.datacamp.com/blog/system-one-models-jev))

**What it cannot do.**

- No prose, no code, no reasoning. It cannot explain a choice. ([OpenRouter Jev guide](https://openrouter.ai/docs/guides/community/jev.md))
- It answers only from the options you list.
- TypeSafe says it "cannot hallucinate." That is a company claim. It means the answer always fits the schema. It does not mean the answer is right. ([TypeSafe blog](https://typesafe.ai/blog/introducing-system-one-models-and-jev); [The Register](https://www.theregister.com/a/5298431))

---

## 2. How to call it

Two ways in.

- **Decisions API:** `POST https://openrouter.ai/api/alpha/decisions`. The word "alpha" means it may change. ([OpenRouter Jev guide](https://openrouter.ai/docs/guides/community/jev.md))
- **System One API:** `POST https://openrouter.ai/api/v1/systemone`. Used with TypeSafe's SDK. ([OpenRouter Jev guide](https://openrouter.ai/docs/guides/community/jev.md))

Every request has three parts: `model`, `state`, and `questions`. Below are short examples, condensed from the docs.

**Choice**

```json
{
  "model": "typesafe/jev-1.14",
  "state": "Walker is in Room 2. Already pressed: door, lamp.",
  "questions": {
    "next": {
      "type": "choice",
      "instructions": "Which target should be pressed next?",
      "criteria": { "door": "...", "lamp": "...", "phone": "..." }
    }
  }
}
```

The answer comes back under `next`, with `choice`, `probabilities`, and `confidence`. ([Choice](https://docs.typesafe.ai/primitives/choice))

**Score**

`criteria` is an ordered list, lowest first. The answer has `score` (a weighted number), `probabilities`, and `legend`. ([Score](https://docs.typesafe.ai/primitives/score))

**Noul**

```json
"is_bug": { "type": "noul", "instructions": "Is the customer reporting a defect?" }
```

The answer is one number, `noul`, from 0 to 1. ([Noul](https://docs.typesafe.ai/primitives/noul))

**Box**

Needs an image in an `assets` map, base64 encoded, and the newest model. The answer has `box` with `top`, `bottom`, `left`, and `right` as fractions. ([Box](https://docs.typesafe.ai/go/box))

**Warning.** The docs do not agree on how `state` and images are wrapped. Some show an object, some an array, some an `assets` map. ([OpenRouter API reference](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request.md); [Multimodal guide](https://openrouter.ai/docs/guides/community/multimodal-decisions.md)) Test one request by hand before building anything on it.

---

## 3. The four fits

**Cost basis.** I assumed each text decision uses about 500 input tokens and 20 output tokens. That is my estimate, not from a source. Per 100 decisions:

- Jev: about $0.002.
- Haiku 5.5: about $0.006. Haiku is $0.10 per million input tokens and $0.50 per million output tokens. ([local Claude API skill price table, cached 6 October 2026](Claude API skill; no web link))

Screenshots add more. Jev's image token count is not published in what I read. I assumed 1,000 to 1,600 tokens per image. That is my guess. On that basis, 100 screenshots cost about $0.01 with Jev and about $0.01 to $0.02 with Haiku.

**Bottom line on cost:** every option here costs cents per walk. Cost does not decide between them.

### a. Jev as the walker's decision policy

**Verdict: works. Worth one experiment. Not better than a simple rule, unless the walk stalls.**

- **How.** Use a Choice question. The options are the labelled targets the walker already reads. The state is the room name and the list of targets already pressed. The walker only presses labels that exist in the list.
- **Cost.** About $0.002 per 100 decisions.
- **Risks.**
  - Walks will not repeat exactly. That makes two maps hard to compare.
  - It has no memory. You must send the visited list every time, or it loops.
  - When the probabilities are close, it is guessing. Log the confidence.
  - A long history can push the request into long-context mode.
  - A model's pick can hide a loop, just as "always press option one" can. The project's own notes warn about this kind of false result.
- **Simpler option.** "Press the least-pressed label, else option one" costs nothing and repeats exactly. Jev only earns its place where that simple rule stalls.
- **Haiku.** Haiku can do the same job. It can also say why it chose something, in plain words. It costs about three times more per text call.

### b. Jev as a visual checker

**Verdict: weak. Use plain code checks or Haiku instead.**

- **Box to find a named button.** Works technically. It needs jev-1.14 and a special header. ([Box](https://docs.typesafe.ai/go/box)) But the walker already knows where its buttons are. The code gives the rectangles. Box adds nothing for finding what the code already knows. It could only confirm a button is on screen. It is still a preview, so its format may change.
- **Score for "is this text readable or overflowing."** I found no published accuracy for Jev on images. The one image test I found was a second-hand snippet. I could not open the source. Measuring text bounds in code is more reliable.
- **Choice for "which era is this screenshot."** Not needed. The walker knows its own era from its own state.
- **Risks.** Every image request runs in long-context mode. That means slower and less accurate, by TypeSafe's own account. Only PNG and JPEG files are accepted. The confidence numbers have not been tested on pictures.
- **Haiku.** Haiku reads images and explains its judgement. For a visual check, it is the better tool.

### c. Jev as a narrative explorer

**Verdict: poor fit. Not recommended.**

- Jev only knows what we put in the state. It would rank branches by how their text reads. It cannot say why.
- A wrong ranking would send a walk down a branch that holds little new. Nothing in the output would show that.
- The project rules say the shipped piece runs only scripted branching, with no live AI. A dev-only ranking would not break that rule. But choosing what a visitor sees should stay a human judgement.
- **Haiku.** Haiku can explain a ranking in plain words. The lead could check that explanation. That is much more useful here.

### d. Jev as a project navigator

**Verdict: good fit. Small gain. A plain search over titles is free and does the same job for now.**

- **How.** Use a Choice question. Each option is a document title, with one line of description as the criteria. Pick the top two answers. If confidence is low, show both to the person asking.
- **Cost.** A few hundredths of a cent per question. About 40 titles fit easily.
- **Risks.**
  - It sees only titles and short descriptions, not the document text.
  - A wrong pick looks certain, because the number is confident. Check `confidence`.
  - It cannot say why it chose a file.
- **Haiku.** Haiku can read the whole document. For a few documents, that is more accurate.

---

## 4. Recommendation

**Try first: a small offline replay.** No change to the piece. No screenshots. No live AI.

1. Pick one walk log in `docs/reinterp/`, for example `WALK_2026-10-31_SPEEDRUN_GUIDED.json`.
2. For each decision point, build the same Choice question. The options are the targets on the screen at that moment. The state is the room and what was already pressed.
3. Ask Jev for its pick and its confidence. Record both.
4. Count two things. How often it picks a target not yet tried. How often it matches "option one."
5. Compare with the simple "least-pressed first" rule.

**Check before starting.** The log may not hold the full target list at each step. If it does not, the walker must log that first.

**Cost.** About $0.002 per 100 decisions.

**Access.** This needs an OpenRouter account and a key. Sérgio would have to create the key himself. I have not asked for one, and I have not used one. Keep the key out of the repo.

**Only if the replay shows value.** Use Jev as a fallback for the walker, only when the simple rule loops.

**Do not do yet.**
- Do not put Jev in the shipped build. The project rules forbid live AI and network calls at runtime. Keep any Jev code in the dev tools only.
- Do not use Jev for screenshots or for ranking narrative branches.

**Questions for Sérgio.**
- Will you create the OpenRouter key yourself, if you want the replay?
- Is it fine for walk text to go to TypeSafe, through OpenRouter? It would be the piece's own labels and text, not player data.
- Someone should confirm the context window on the live model page.

---

## 5. Sources

**Read and used**

- TypeSafe launch blog: https://typesafe.ai/blog/introducing-system-one-models-and-jev
- OpenRouter Jev guide (markdown): https://openrouter.ai/docs/guides/community/jev.md
- OpenRouter Jev guide (page, read through its link): https://openrouter.ai/docs/guides/community/jev
- Choice: https://docs.typesafe.ai/primitives/choice
- Score: https://docs.typesafe.ai/primitives/score
- Noul: https://docs.typesafe.ai/primitives/noul
- Box: https://docs.typesafe.ai/go/box
- TypeSafe docs overview: https://docs.typesafe.ai
- Multimodal guide: https://openrouter.ai/docs/guides/community/multimodal-decisions.md
- OpenRouter Decisions API reference: https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request.md
- DataCamp article (price, speed, accuracy, use cases): https://www.datacamp.com/blog/system-one-models-jev
- The Register article, 23 September 2026 (price, speed, demos, criticism): https://www.theregister.com/a/5298431
- eesel pricing article (price, 32,000-token window for jev-1.13.0): https://www.eesel.ai/blog/typesafe-jev-pricing
- Claude Haiku 5.5 price: local Claude API skill table, cached 6 October 2026 (no web link; not checked live)

**Tried, could not read**

- OpenRouter model page: https://openrouter.ai/typesafe/jev-1.14 (404)
- OpenRouter model page, alternate: https://openrouter.ai/models/typesafe/jev-1.14 (404)
- OpenRouter alias page: https://openrouter.ai/~typesafe/jev-latest (404)
- Towards AI article on a QA attempt: https://pub.towardsai.net/your-test-suite-doesnt-need-a-chatbot-it-needs-a-judge-1ce21ad6a4e6 (403; known only from a search snippet)
- The New Stack article: https://thenewstack.io/typesafe-jev-system-one/ (no body text; known only from a search snippet)

**Not used.** A search snippet mentioned a tester who planted seven defects. I could not find or open the source. I left it out.

**Not found.** Image token cost for Jev. Image token cost for Haiku 5.5.
