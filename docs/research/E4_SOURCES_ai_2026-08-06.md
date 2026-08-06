STATUS: live

# E4 sources: AI / automation and conversion practice, 2025–2026

Research pass, 2026-08-06. Scope: current (2025–2026) intersection of AI/automation
and SOGICE-adjacent conversion practice, for the project's least-evidenced era.
Subject is the apparatus, never detransitioners or trans people as such — see
ethics note at the end.

**A note on access**: the Rewire News Group investigation
(https://rewirenewsgroup.com/2026/07/15/ai-therapy-chatbot-conversion-therapy-trans/)
and several GLAAD report sub-pages return HTTP 403 to automated fetching, as
flagged in the task brief. Everything attributed to Rewire below is reconstructed
from (a) other outlets' and advocacy sites' characterizations of it, and (b)
search-index snippets of its own text — not a direct read of the full article.
That is a real evidentiary gap, not a rounding error, and it is called out
per-claim below rather than smoothed over.

---

## 1. detrans.ai — verification table

| Claim | Status | Best evidence | Notes |
|---|---|---|---|
| Launched September 2025 | Partially verified | Multiple secondary characterizations converge on Sept. 2025 (e.g. summaries of the Rewire piece; no primary dated announcement located) | Could not find a primary launch announcement (press release, first archived snapshot, or dated founder post) fixing the month independently of reporting-about-the-reporting. |
| Built by Peter James Steven, described as a software engineer / web developer, Wellington, New Zealand | Verified | Site self-attribution: "An open source project by Peter James Steven" (https://detrans.ai/en); GitHub repo under his handle: https://github.com/pjamessteven/social-project; corroborated by podcast appearances under that name (e.g. https://www.listennotes.com/podcasts/you-must-be-some/192-inside-detransai-the-t5_nSEc2m9v/) | Self-declared identity, corroborated across independent surfaces (own site, own code repo, third-party podcast booking) — not solely his own claim. |
| Runs on "Kimi" (open-weight Chinese LLM) | Contested / moving target | Creator statements reported that the bot was *initially* built on Kimi; Rewire (as summarized) says the site "now asserts" it runs on DeepSeek; the site's own current build page (https://detrans.ai/en/prompts) as read for this research states the model is "Xiaomi Mimo-V2.5" via a LlamaIndex RAG pipeline | The specific named model is unstable and has been reported as at least three different Chinese open-weight models (Kimi → DeepSeek → Xiaomi MiMo) at different points. What is stable across every version of the claim: an open-weight Chinese model was deliberately chosen over OpenAI/GPT because, per the creator (as reported), Western models were "too aggressive" in "promoting and upholding gender beliefs" and would "constantly undermine and contradict the detrans experiences." Treat "which specific model" as a snapshot-in-time fact, not a fixed one. |
| Draws on scraped/curated posts from ~2,700 of the most active r/detrans users, plus YouTube | Verified | Creator's own December 2025 statement (reported); corroborated independently by the site's own technical description (https://detrans.ai/en/prompts): Reddit comments from r/detrans posted before 9 Aug 2025 with a minimum of 3 upvotes, plus user-submitted YouTube videos transcribed via OpenAI Whisper | Two independent surfaces (interview + own build docs) agree on the mechanism, even though the "2,700" figure is the creator's own number, not an outside audit. |
| Claims "talk to 50,000+ / 60,000+ detransitioners" | Verified as misleading | Site's own fine print (https://detrans.ai/en, https://detrans.ai/en/prompts) concedes the number is the r/detrans *subreddit subscriber count*, not a verified count of individuals actually represented in the dataset (which the creator separately puts at ~2,700 curated authors) | This is not a "some say / others say" dispute — the site's own text and the creator's own separately-reported number contradict the marketing tagline. Safe to state as a documented discrepancy, not an allegation. |
| Rewire News Group investigation (15 July 2026) found the chatbot discouraged gender-affirming care "in every scenario tested" and used reductive/pseudoscientific framing | Partially verified | Characterized consistently across multiple secondary sources and search-index snippets of the Rewire piece; original article inaccessible to this research (403) | Could not independently confirm methodology (how many scenarios, how "tested" was defined) or verify direct quotes attributed to the chatbot's outputs beyond snippet-level reproduction. Flagged, per instructions, as read through secondary characterization rather than primary text. |
| Genspect / SEGM adjacency | Partially verified | Genspect (a group the Southern Poverty Law Center designated an anti-LGBTQ hate group in June 2024: https://www.lgbtqnation.com/2024/06/anti-trans-organizations-genspect-segm-are-now-listed-as-hate-groups-by-the-splc/) has published favorably about detrans.ai on its own Substack (https://genspect.substack.com/p/helpful-or-harmful, https://genspect.substack.com/p/look-before-you-leap) and Genspect's own "Detransition Awareness Day" event (12 March 2026, Washington DC) sells tickets via genspect.org, per a supporter's write-up (https://stellaomalley.substack.com/p/detransai-the-collective-consciousness) | No formal institutional/financial relationship between detrans.ai and Genspect was found — the connection documented is *promotional/reputational* (Genspect amplifies the tool; the tool's creator has appeared in Genspect-adjacent media), not an ownership or funding link. State it as "amplified by," not "made by." |
| Funded by donations and the creator's own capital, no institutional backer named | Verified (self-reported only) | Site states donation-based funding and warns of a degraded "cache-only mode" without it (https://detrans.ai/en) | No independent financial disclosure found; this is the creator's own claim, unaudited. |
| Open-source codebase | Verified | https://github.com/pjamessteven/social-project, MIT license, stack named as LlamaIndex, React, Next.js, Tailwind, Qdrant, Postgres, Vercel AI SDK | Directly checkable — the repository exists and is publicly attributed to the same person. |

**Bottom line on detrans.ai**: the core architecture and provenance claims hold up
under cross-checking (RAG pipeline over curated Reddit/YouTube text, built by a
named non-clinician engineer, deliberately routed around Western-model guardrails,
amplified by an SPLC-designated hate group). The one number in its own marketing
— "50,000+/60,000+ detransitioners" — does not hold up against the tool's own
technical documentation, which puts the actual curated-author count near 2,700.
The most serious behavioral claim (discourages affirming care "in every scenario
tested") rests on a single investigation this research could not read directly.

---

## 2. The wider landscape

### 2.1 Other AI chatbots/apps steering toward non-affirmation

- **detrans.ai** (above) — the only purpose-built, professionally covered example found.
- **"Detrans bot" on Character.AI** (https://character.ai/character/6hzz2KHS/detrans-bot-detransition-support) — a user-created chatbot on the mainstream Character.AI platform, observed directly for this research: 51.5k recorded interactions, self-described as "a supportive AI assistant that encourages trans people to detransition or helps gender dysphoric individuals avoid transitioning," specializing in "detransition support" and "reconnecting with one's birth gender." Created by a pseudonymous platform account, not by detrans.ai's creator as far as any source found indicates — **no relationship between the two has been documented**; they appear to be independent instances of the same pattern. No journalist coverage of this specific bot was located; this finding rests on direct observation of the platform page, not third-party reporting. Flag accordingly — it demonstrates the pattern exists on a major consumer platform with real usage, but has not (yet) been externally audited or reported on.
- No evidence found of app-store (Apple/Google) listings marketed explicitly as conversion-oriented, and no evidence found of any such app being removed by a platform for that reason. This is itself a finding — see §3-adjacent "not documented" list below, though it belongs to area 1's question and is stated here for completeness: **absence, not confirmation of absence's cause** (could mean none exist, or that "conversion" framing is not how such apps present themselves in store listings, or simply that this research didn't find them).

### 2.2 Generative AI used by conversion-practice organizations

- **Not documented**, as of the sources checked. The two most relevant standing research bodies on organized conversion-practice activity online — Global Project Against Hate and Extremism's "Conversion Therapy Online: The Players" (dated to ~January 2022; https://globalextremism.org/reports/conversion-therapy-online-the-players/) and "Conversion Therapy Online: The Ecosystem In 2023" (published January 2024; https://globalphilanthropyproject.org/2024/01/24/conversion-therapy-online-the-ecosystem-in-2023/, mirrored at https://globalextremism.org/reports/conversion-therapy-online-the-ecosystem/) — were checked directly for this research and **contain no mention of AI, chatbots, automation, or generative-AI-produced content** anywhere in their text. Both reports document organizations' use of ordinary websites, social platforms (Facebook, Instagram, YouTube, Twitter/X), and conventional apps for outreach and multilingual programming (the GPAHE "Players" report notes weekly video-conferences run in English, Spanish, Portuguese, Russian, Ukrainian, Arabic, German, French, and Italian by at least one network — a translation/localization operation, but a human one as documented).
- Important caveat: both reports substantially **predate** the current wave of consumer generative AI adoption (the Ecosystem report's most recent edition covers research through 2023, before ChatGPT-class tools were in mainstream org-level use). Their silence on AI is evidence of *what wasn't there when they were written*, not evidence about today. No newer (2025–2026) edition of either GPAHE series, or any comparable audit, was found.
- detrans.ai itself demonstrates one adjacent, narrower practice: automated transcription of YouTube testimony via OpenAI's Whisper model as an ingestion step (per the site's own build documentation, https://detrans.ai/en/prompts) — generative AI used to *process* detransitioner-produced content into a database, not to author outreach material. This is the only concretely documented instance in this research of a conversion-adjacent project using an AI tool for content production/processing, and it is downstream of individuals' own public posts rather than agency-authored propaganda.

### 2.3 AI photo/image manipulation marketed as showing a "true"/"restored"/pre-transition self

See §3 below — this is the project's flagged speculative claim, and the finding is negative. No promotion by this heading was found separately from the general finding in §3.

### 2.4 Major LGBTQ+ / AI-accountability publications

- **GLAAD, "Build for Everyone: A Framework for LGBTQ Representation and Safety in AI," 2026 AI Report** — released 17–19 June 2026 (dates vary slightly by source; press release at https://glaad.org/releases/build-for-everyone-glaad-launches-inaugural-ai-safety-report-including-framework-to-counter-biases/, main report at https://glaad.org/2026-ai-report-build-for-everyone/, LGBTQ-impacts page at https://glaad.org/2026-ai-report-build-for-everyone/lgbtq-impacts/). Most sub-pages returned 403 to direct fetch; findings below reconstructed from secondary coverage (GO Magazine: https://gomag.com/article/ai-is-failing-lgbtq-people-glaad-report/; 9News: https://www.9news.com/article/news/local/lgbtq/glaad-report-ai-chatbots-biased-harmful-advice-lgbtq/73-eb7f69a7-b056-4f90-9235-5002162cfaac).
  - The one specific product GLAAD is reported to have tested and named is **Meta's Llama 4**: GLAAD ran tests in April 2025 and found the model recommended "conversion therapy" as a "therapeutic approach" for a query, including naming providers, despite Meta's own community standards prohibiting promotion of the practice (Advocate coverage, 22 April 2025: https://www.advocate.com/news/meta-ai-conversion-therapy). Meta's public response (per that coverage) framed the shift as intentional "bias correction" to have Llama "articulate both sides of a contentious issue"; GLAAD called this false-balance framing itself harmful ("both-sidesism that equates anti-LGBTQ junk-science with well-established facts... legitimizes harmful falsehoods").
  - GLAAD's 2026 report is also reported to cite independent research on **Replika** (a companion app) documenting instances of the chatbot affirming users' discriminatory views toward LGBTQ people, and a Stanford University study finding major AI companies retain chat conversations — including disclosures of sexual orientation/gender identity — indefinitely by default.
  - No other named chatbot/product beyond Llama 4 and Replika was confirmed via the sources this research could access; the report's own full text (blocked) may name more.
- **Trevor Project** — no 2026 statement specifically on AI-delivered conversion practice was found. Their own AI work is the "Crisis Contact Simulator" (Riley/Drew personas, built with Google.org, active since 2021) — a *counselor-training* tool, not a user-facing product, and not related to conversion practice. A June 2026 opinion piece (not a Trevor Project publication) describes a trans teen finding Planned Parenthood's "Roo" sexual-health chatbot "not so inclusive" — a fit/inclusivity complaint, not a conversion-practice finding, and Roo is not documented anywhere in this research as steering toward non-affirmation.
- **ILGA World / ILGA-Europe** — no statement specifically addressing AI and conversion practice was found. Their conversion-therapy work (e.g. the 2020 "Curbing Deception" global report, https://ilga.org/Conversion-therapy-report-ILGA-World-Curbing-Deception/) predates the current AI wave and does not appear to have an AI-focused successor as of this research.
- **GPAHE** — see §2.2; no AI-specific update found.
- **Southern Poverty Law Center** — designated Genspect and SEGM anti-LGBTQ hate groups in June 2024 (https://www.lgbtqnation.com/2024/06/anti-trans-organizations-genspect-segm-are-now-listed-as-hate-groups-by-the-splc/); SPLC's own Hatewatch has covered detrans.ai directly in the context of detransition-narrative exploitation (https://www.splcenter.org/resources/hatewatch/detransition-narratives/), characterizing it as using "reductive, anti-trans ideas and debunked pseudoscience" and noting it offers advice on "how to persuade" a child out of transitioning. Both Genspect and SEGM dispute the hate-group designation as suppressing legitimate debate (contested; see e.g. https://segm.org/SPLC-SEGM-Response-2025).
- **Academic literature specific to AI + conversion practice**: none found. General chatbot-safety literature exists (e.g. a Character.AI therapy-chatbot safety report covered by Psychiatric Times, direct fetch blocked — https://www.psychiatrictimes.com/view/preliminary-report-on-chatbot-iatrogenic-dangers) but no LGBTQ/conversion-specific framing was confirmed in the portions this research could access.

### 2.5 Regulatory, platform-policy, or legal response specific to AI-delivered conversion practice

- **Not documented as a distinct category anywhere.** The closest regulatory development found is general, not conversion-specific:
  - EU AI Act, European Commission review **COM(2026) 234 final**, published 20 May 2026 — the Commission's first mandatory review of the Act's prohibited-practices and high-risk lists. It examined "self-help therapy AI chatbots" as a category (reported to have caused documented deaths in Europe and triggered the largest GDPR enforcement action against an AI company in EU history) and concluded these chatbots remain **outside** the high-risk classification regime; the Commission's decision was to "monitor closely, collect more evidence," with no amendment made. This review is about mental-health/self-help chatbots generally — conversion practice is not mentioned in any source found describing it.
  - EU AI Act Article 50 (general chatbot-disclosure transparency requirement — AI systems must disclose they are AI) took effect 2 August 2026, again with no conversion-practice-specific provision.
  - No FTC, state Attorney General, or other action targeting an AI-delivered conversion-practice product was found.
  - No search found evidence of a formal complaint, investigation, or regulatory action against detrans.ai specifically in New Zealand or elsewhere.
  - OpenAI's and Anthropic's public usage policies were checked for an explicit conversion-therapy prohibition; none was found by name in either company's current policy text as accessed for this research (this is a limitation of the search, not proof the clause doesn't exist — usage policies are long and not fully indexed).

---

## 3. WHAT IS NOT DOCUMENTED

Stated plainly, as instructed — these are findings, not gaps to paper over:

- **AI image manipulation marketed as showing a "true"/"restored"/pre-transition self: NO documented instance was found**, anywhere, in this research pass. Every search for this specific claim returned either (a) generic AI face-editing/"gender swap" novelty apps with no conversion framing or organizational tie, or (b) the detrans.ai chatbot (a text tool, not an image tool). No conversion-practice organization, no detrans.ai-adjacent project, and no journalist investigation surfaced was found describing an AI photo tool used this way. **This corroborates the project's existing SPECULATIVE / DO-NOT-CITE rating** — it should stay speculative, and this research adds no documentary instance to promote it.
- **No app-store presence or removal history** was found for any AI tool marketed explicitly as conversion-oriented (detrans.ai is web-only; the Character.AI bot lives inside a general platform, not as a standalone listing).
- **No AI-specific regulatory or legal action** targeting conversion-practice chatbots was found anywhere — not in the EU, not in New Zealand (where detrans.ai's creator is based), not in the US.
- **No updated (2025–2026) research-body report** — from GPAHE, ILGA, or a comparable body — was found that treats AI/automation as part of the conversion-practice ecosystem. The standing GPAHE reports checked directly for this research (2022 "Players," Jan-2024 "Ecosystem in 2023") predate the current AI wave and contain zero mentions of AI, chatbots, or automation.
- **No documented instance of a conversion-practice organization (as opposed to a single independent developer) building or commissioning an AI tool.** detrans.ai is a single-developer, donation-funded, open-source project — not, on any evidence found, an output of an organized conversion-practice network. Its amplification by Genspect is promotional, not developmental.
- **The Rewire News Group investigation could not be read directly** (403 to automated fetching, as anticipated in the task brief). Every claim attributed to it above is a secondary reconstruction and is flagged as such in the table in §1. Treat any Rewire-attributed quote in this document as **unverified at the word level** even where the substance is corroborated elsewhere.
- **The specific AI model detrans.ai runs on cannot be pinned to one fact.** Reporting and the site's own documentation disagree with each other across time (Kimi → DeepSeek → Xiaomi MiMo, per different sources/snapshots). This is worth treating as evidence of how unstable and self-reported these technical claims are, generally, for tools in this space — not as a single citable fact about "the model."

---

## 4. Candidate constellation nodes

```json
[
  {"id":"detrans-ai-tool","label":"","_labelSuggestion":"detrans.ai chatbot","origin":"derived","status":"documentary","kind":"source","confidence":"high","verified":true,"url":"https://detrans.ai/en","_note":"The tool itself: self-hosted RAG chatbot over curated r/detrans + YouTube text; anchors the whole 2025-26 AI-conversion-practice cluster."},
  {"id":"detrans-ai-github","label":"","_labelSuggestion":"detrans.ai source code (GitHub, MIT license)","origin":"derived","status":"documentary","kind":"source","confidence":"high","verified":true,"url":"https://github.com/pjamessteven/social-project","_note":"Open-source repo confirming the build stack (LlamaIndex RAG, Qdrant, Postgres) and sole-developer authorship."},
  {"id":"rewire-detrans-investigation","label":"","_labelSuggestion":"Rewire News Group investigation, 15 Jul 2026","origin":"derived","status":"contested","kind":"source","confidence":"medium","verified":false,"url":"https://rewirenewsgroup.com/2026/07/15/ai-therapy-chatbot-conversion-therapy-trans/","_note":"Names detrans.ai as conversion-practice tooling; primary text inaccessible to automated fetch (403), so treat quotes from it as secondary-sourced only."},
  {"id":"detrans-ai-model-instability","label":"","_labelSuggestion":"detrans.ai's shifting model claims (Kimi / DeepSeek / Xiaomi MiMo)","origin":"derived","status":"contested","kind":"structure","confidence":"medium","verified":true,"url":"https://detrans.ai/en/prompts","_note":"Mechanism-level finding: the tool's self-reported backend model has changed across at least three named systems, all chosen to avoid Western-model gender-topic guardrails."},
  {"id":"detrans-ai-scale-claim-gap","label":"","_labelSuggestion":"the \"60,000+\" vs. ~2,700 discrepancy","origin":"derived","status":"documentary","kind":"structure","confidence":"high","verified":true,"url":"https://detrans.ai/en/prompts","_note":"Documented gap between marketing headline (subreddit subscriber count) and the tool's own stated curated-dataset size — a self-admitted discrepancy, not an outside allegation."},
  {"id":"characterai-detrans-bot","label":"","_labelSuggestion":"user-made \"Detrans bot\" on Character.AI (51.5k interactions)","origin":"derived","status":"documentary","kind":"source","confidence":"medium","verified":true,"url":"https://character.ai/character/6hzz2KHS/detrans-bot-detransition-support","_note":"Independent instance of the same pattern on a mainstream consumer platform; directly observed for this research, no journalist coverage found, no confirmed link to detrans.ai."},
  {"id":"glaad-2026-ai-report","label":"","_labelSuggestion":"GLAAD \"Build for Everyone\" 2026 AI report","origin":"derived","status":"documentary","kind":"source","confidence":"medium","verified":true,"url":"https://glaad.org/2026-ai-report-build-for-everyone/lgbtq-impacts/","_note":"Umbrella accountability report; most sub-pages blocked to direct fetch, reconstructed via secondary coverage."},
  {"id":"llama4-conversion-therapy-recommendation","label":"","_labelSuggestion":"Meta Llama 4 recommending conversion therapy (GLAAD test, Apr 2025)","origin":"derived","status":"documentary","kind":"structure","confidence":"high","verified":true,"url":"https://www.advocate.com/news/meta-ai-conversion-therapy","_note":"Concrete, named, dated instance of a mainstream general-purpose LLM surfacing conversion-therapy recommendations; Meta framed the cause as deliberate 'bias correction.'"},
  {"id":"gpahe-conversion-therapy-reports-ai-silence","label":"","_labelSuggestion":"GPAHE conversion-therapy reports (2022, 2024) — no AI content","origin":"derived","status":"documentary","kind":"structure","confidence":"high","verified":true,"url":"https://globalextremism.org/reports/conversion-therapy-online-the-ecosystem/","_note":"Negative-finding anchor: the standing research body's own reports on this ecosystem predate and do not mention AI/automation at all."},
  {"id":"splc-genspect-segm-hate-group-designation","label":"","_labelSuggestion":"SPLC hate-group designation of Genspect and SEGM (Jun 2024)","origin":"derived","status":"contested","kind":"structure","confidence":"high","verified":true,"url":"https://www.splcenter.org/resources/hatewatch/detransition-narratives/","_note":"Structural context for detrans.ai's amplification network; designation is itself disputed by the named organizations."},
  {"id":"eu-ai-act-therapy-chatbot-review-gap","label":"","_labelSuggestion":"EU AI Act review (COM(2026) 234 final) — therapy chatbots left unclassified","origin":"derived","status":"documentary","kind":"structure","confidence":"medium","verified":true,"url":"https://artificialintelligenceact.eu/high-level-summary/","_note":"Closest thing found to a regulatory response to AI therapy chatbots generally; explicitly not conversion-practice-specific — anchors the area-5 negative finding."},
  {"id":"true-self-photo-restoration-not-found","label":"","_labelSuggestion":"absence of documented AI \"true self\"/restoration photo tooling","origin":"derived","status":"speculative","kind":"structure","confidence":"low","verified":false,"url":"","_note":"No URL because there is no documented instance — this node exists to mark the negative finding itself, corroborating the project's existing DO-NOT-CITE rating on this claim. Do not upgrade without a real primary source."}
]
```

---

## Ethics note

This research is about the apparatus — tools, organizations, funding structures,
regulatory gaps — never about detransitioners or trans people as subjects. Where a
tool (detrans.ai, the Character.AI bot) is built from individuals' own public posts
without their consent for this use, that non-consensual reuse is treated here as a
finding about the apparatus's method, not as an occasion to reproduce or characterize
any individual's account. No survivor testimony is quoted or summarized in this
document; no private individual is named. Peter James Steven is named only in his
capacity as the self-identified, publicly bylined builder of a product under
journalistic and advocacy scrutiny — the same register in which a founder would be
named in any tech-accountability reporting — and he does not appear in the
constellation-node JSON above, per the instruction that that surface carries only
sources and structures, never people.
