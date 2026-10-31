STATUS: live
# Jev: research for the project

Research date: 31 October 2026. Prices and model features can change. This is a desk study, not a test of Jev on this project.

## 1 What Jev is (with sources)

Jev is a hosted decision model from TypeSafe. TypeSafe calls this kind of model a System One model. You give it information and a tightly defined question. It returns a structured decision and, usually, probabilities. It does not write prose or code, explain its reasoning, operate a browser, or make a plan by itself. Separate software must do the actions. [TypeSafe introduction](https://typesafe.ai/blog/introducing-system-one-models-and-jev); [OpenRouter guide](https://openrouter.ai/docs/guides/community/jev).

There are four question types:

- **Choice:** pick one item from a supplied list. It also gives probabilities for the options.
- **Score:** rate something against an ordered scale of 2–10 descriptions. The number can fall between levels.
- **Noul:** give the probability that a yes/no statement is true. The fourth name is indeed Noul.
- **Box:** locate an item in an image. It returns the four edges as fractions of image width and height.

Choice supports up to 255 options. Box has no reliable “not found” result: it can return a box even if the item is absent. Ask a separate Noul question about presence. Image and Box support are early features. [OpenRouter's worked examples](https://openrouter.ai/blog/insights/what-is-jev/); [TypeSafe JavaScript SDK](https://github.com/typesafe-ai/typesafe-sdk-js); [API reference summary](https://typesafe-jev.ai/jev-api/).

Jev 1.14 accepts text and images, including PNG and JPEG. It does not accept audio or video directly. OpenRouter lists a 262,144-token context window. A token is a small chunk of text, not a word. [Model page](https://openrouter.ai/typesafe/jev-1.14); [worked examples and limits](https://openrouter.ai/blog/insights/what-is-jev/).

The normal mode has a 64,000-token total request limit, and 32,000 tokens for the state plus any one question. Long-context mode raises both to 262,144 tokens. OpenRouter activates it for over roughly 32,000 **bytes** of text or any image. Bytes are not tokens. TypeSafe says the longer mode is slower and less accurate. [OpenRouter explanation](https://openrouter.ai/blog/insights/what-is-jev/).

At the time checked, OpenRouter listed Jev 1.14 at **$0.042 per million input tokens**, with output free. Its displayed median provider latency was about **0.11 seconds**. That is a changing service statistic, not a promise for a full walk or for images. The page also said EU in-region routing was unavailable. [OpenRouter model page](https://openrouter.ai/typesafe/jev-1.14).

**Are people using it this way?** Yes, there are public experiments. [Jev Browser](https://github.com/jkudish/jev-browser) describes selecting browser actions from known controls. [Jev Automation Testing](https://github.com/vankhangfet/jev-automation-testing) describes judging screenshots for clipping and other UI issues. These are authors' reports, not independent proof that it will work for our pixel-art screens. A [Pokémon experiment](https://www.tomshardware.com/tech-industry/artificial-intelligence/developer-says-jev-decision-model-beat-pokemon-red-in-under-a-week-non-llm-engine-succeeds-where-traditional-chatbots-stalled-for-months-but-claude-opus-5-coached-the-model-through-its-dead-ends) used Jev to select actions, with extensive help from surrounding software and Claude. It does not establish that Jev can play an arbitrary game alone.

## 2 How to call it (with tiny examples)

A developer sends a request to OpenRouter's Decisions endpoint, `POST https://openrouter.ai/api/alpha/decisions`. The request contains a model, the information to inspect (`state`), and named `questions`. Multiple questions can share one request. [OpenRouter examples](https://openrouter.ai/blog/insights/what-is-jev/).

This is a small illustrative request, with invented state and option names:

```json
{
  "model": "typesafe/jev-1.14",
  "state": "Screen: menu. Available: Continue, Help.",
  "questions": {
    "next": {
      "type": "choice",
      "instructions": "Which action advances the story?",
      "criteria": {"continue": "Continue the story", "help": "Open help"}
    }
  }
}
```

A possible abbreviated response is below. The numbers are made up to show the shape. Real responses also include model and usage details.

```json
{"answers":{"next":{"type":"choice","choice":"continue",
  "probabilities":{"continue":0.9,"help":0.1},"confidence":0.7}},
 "usage":{"input_tokens":400,"output_tokens":30}}
```

For a screenshot, `state` can include a text part and an `image_url` part containing a PNG or JPEG as a base64 data URL. For example, the image part has the shape `{"type":"image_url","image_url":{"url":"data:image/png;base64,..."}}`. The dots stand for image data. [OpenRouter's image example](https://openrouter.ai/blog/insights/what-is-jev/).

Other question shapes can be included in the same `questions` object. These illustrative answers omit the surrounding `answers` wrapper:

```json
// Score question; levels go from low to high
{"type":"score","instructions":"Is text clipped?",
 "criteria":["No clipping", "Some clipping", "Much text clipped"]}
// Possible answer
{"type":"score","score":0.2,"legend":{"0":"No clipping","1":"Some clipping","2":"Much text clipped"},
 "probabilities":{"0":0.8,"1":0.2,"2":0.0},"confidence":0.7}

// Noul question and possible answer
{"type":"noul","instructions":"Is a Help button visible?"}
{"type":"noul","noul":0.8}

// Box question and possible answer
{"type":"box","instructions":"The Help button including its border"}
{"type":"box","box":{"top":0.2,"bottom":0.3,"left":0.4,"right":0.6},"confidence":0.8}
```

The snippets labelled with comments show separate examples; comments are not part of JSON. Confidence is not a guarantee of correctness. It needs checking against examples from our own project. [OpenRouter confidence discussion](https://openrouter.ai/blog/insights/what-is-jev/).

## 3 The four fits a–d (verdict, how, cost, risks)

**Cost assumptions for comparison:** One imagined walk has 100 decisions. A text decision sends 500 input tokens, so 50,000 input tokens per walk cost about **$0.0021** with Jev. This is an example, not a measurement of our walker. Repeated context counts each time. Images add tokens; actual image charges depend on image processing and size. One published image example used 1,034 total input tokens, but that is not a universal screenshot price. At 1,000 tokens per screenshot, 100 checks would be about **$0.0042**. [Jev price](https://openrouter.ai/typesafe/jev-1.14); [image example](https://openrouter.ai/blog/insights/what-is-jev/).

For comparison, [Claude Haiku 4.5 on OpenRouter](https://openrouter.ai/anthropic/claude-haiku-4.5/) is listed at $1 per million input tokens and $5 per million output tokens. With the same 50,000 text input tokens and 5,000 output tokens, that is about **$0.075 per walk**. Actual usage, image token counts, output length, provider and prices vary. Haiku can explain, write and use tools, but also needs a harness and can be wrong.

### a. Walker decision policy

**Verdict: plausible, and the strongest first test.** Give Jev the current screen, goal, short history, and labelled pressable targets. Ask Choice to select a target. The existing walker still performs the press and checks what happened. Start with text only.

**Cost:** Under the 100-step assumption, about 50,000 input tokens and $0.0021 per walk. Screenshots would add tokens and activate long-context mode; the illustrative 100-image total above is $0.0042 if each whole request is 1,000 input tokens.

**Risks:** It can loop, choose an unhelpful option, miss a branch, or be confidently wrong. Add a step limit, loop detection, legal-target validation, and a deterministic fallback. Record the chosen label and result. Compare coverage with option-one and simple unvisited-first rules. A model call during the shipped experience would violate the project's no-runtime-network rule. This proposal belongs in the separate development walker only.

### b. Visual checker

**Verdict: worth a controlled experiment, not a trusted pass/fail judge.** Box could locate a named button; Score could grade visible clipping or readability on a defined scale; Choice could classify the era. Ask Noul whether a target exists before relying on a Box. Use the known hit rectangles for actual presses when available.

**Cost:** For 100 screenshots, an illustrative 100,000 input tokens costs $0.0042. Image resolution and provider accounting may change this significantly. Measure real usage before budgeting.

**Risks:** Tiny pixel text, perspective, glare, deliberately soft visuals and cropping may fool it. Readability for an actual person cannot be established from a model score. A screenshot can look fine while interaction is broken. Keep human review, actual device checks, and deterministic geometry or image comparisons. Haiku can give a written explanation, but its visual judgment also needs validation.

### c. Narrative explorer

**Verdict: useful as a ranking helper, insufficient as an enumerator.** Let the walker and its map enumerate reachable choices and track visited states. Give Jev a bounded list of unvisited choices and short context; ask which is most likely to reveal something new. Or score candidates and sort them in code. It cannot discover an unseen branch from nothing or explain its selection.

**Cost:** If 100 rankings each use 500 input tokens, roughly 50,000 tokens and $0.0021 per walk. Larger histories cost more. An offline graph traversal may cost nothing in model fees and provide more reliable coverage.

**Risks:** Labels can hide consequences, state may be incomplete, and a plausible ranking is not evidence of new content. Repeat runs and compare unique states and branches against a systematic unvisited-first baseline. Haiku can propose and explain hypotheses, but cannot guarantee complete coverage either.

### d. Project navigator

**Verdict: plausible for routing a question to a short list of files.** Supply document titles, paths, and brief descriptions as Choice options. Return the selected path, then let ordinary software open it. For more than 255 options, first narrow the list with search or group it in stages. Include a “none suitable” option.

**Cost:** This is per question, not per walk. At 2,000 input tokens, one route costs about $0.000084. One hundred such routes would use 200,000 tokens and cost about $0.0084. A keyword search is free to run locally.

**Risks:** Titles may be vague or stale. The right answer may span multiple files, and Jev cannot answer the question itself. Return several candidates or fall back to search. Haiku can read the selected documents and produce a sourced explanation, at a higher cost.

## 4 Recommendation (what to try first, smallest experiment)

Try **a: text-only action selection** first. It fits the walker's existing list of labelled targets. It avoids the uncertainties of image processing.

Use a small, fixed set of recorded screen states with known useful next actions. Compare Jev against option one and unvisited-first. Count correct legal actions, loops, unique branches reached, time, and actual token usage. Review disagreements by hand. Only then try a short live development walk, with a step cap and no changes to the shipped experience.

If this adds coverage, separately test visual checks against a small set of screenshots with known clipping and clean controls. Do not treat either experiment as a replacement for human or headset review.

## 5 Sources (every URL used)

- TypeSafe introduction: https://typesafe.ai/blog/introducing-system-one-models-and-jev
- OpenRouter Jev guide: https://openrouter.ai/docs/guides/community/jev
- OpenRouter Jev model and prices: https://openrouter.ai/typesafe/jev-1.14
- TypeSafe model documentation: https://docs.typesafe.ai/models
- TypeSafe JavaScript SDK: https://github.com/typesafe-ai/typesafe-sdk-js
- OpenRouter worked examples, image input and limits: https://openrouter.ai/blog/insights/what-is-jev/
- Independent API reference summary for choice limit: https://typesafe-jev.ai/jev-api/
- Browser automation example: https://github.com/jkudish/jev-browser
- Screenshot testing example: https://github.com/vankhangfet/jev-automation-testing
- Pokémon experiment reporting: https://www.tomshardware.com/tech-industry/artificial-intelligence/developer-says-jev-decision-model-beat-pokemon-red-in-under-a-week-non-llm-engine-succeeds-where-traditional-chatbots-stalled-for-months-but-claude-opus-5-coached-the-model-through-its-dead-ends
- Claude Haiku 4.5 model and prices: https://openrouter.ai/anthropic/claude-haiku-4.5/
