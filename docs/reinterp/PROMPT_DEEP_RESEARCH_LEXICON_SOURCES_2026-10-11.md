STATUS: live

# Deep Research prompt — sources for the Lexicon, word by word (2026-10-11)
*His ask (2026-10-11): "If you need sources make me a prompt for a deep research." The Lexicon (27 words, 31 reasons)
rests on docs/reinterp/RESEARCH_LEXICON_2026-10-02.md, which has ~32 web sources; some entries lean on Wikipedia or on
local books that cannot be linked, and the Sources tab shows only links he has verified. This prompt fills the gaps.
Paste the block into a Deep Research run (ChatGPT Deep Research or Claude Research). Save its answer as
docs/reinterp/RESEARCH_LEXICON_SOURCES_<date>.md; Claude then checks every URL against it and builds his tick list.*

---

```
I am building an educational museum artwork about how conversion-practice (SOGICE) networks targeted LGBTQ+ people
online from 1997 to 2026. Inside it is a "Lexicon": the words these networks used and the reasons they gave for people
being gay, lesbian, bisexual or trans. For each entry I need SOURCES a visitor can follow, of two kinds kept apart:
  USE — evidence that conversion-practice organisations/ministries/therapists actually used the word or gave the reason
        (their own pages, ideally a Wayback Machine capture with its exact timestamp; their own publications);
  CLAIM — what the best evidence says about whether it is true (statements of major health/human-rights bodies:
        APA, American Psychiatric Association, WHO/ICD-11, UN Independent Expert on SOGI A/HRC/44/53, the UK
        Memorandum of Understanding on Conversion Therapy, Royal Colleges, peer-reviewed reviews).

RULES
- Give the exact URL you actually opened for every source; for organisation pages prefer an archived capture
  (web.archive.org/web/<timestamp>/...) and give the timestamp the archive served. Say if a page was paywalled or
  returned an error. Never invent or "reconstruct" a URL.
- One quote per source at most, under 15 words, with where it appears.
- Prefer primary sources over Wikipedia; use Wikipedia only to find the primary source.
- No private individuals: name organisations and published authors only.
- For the live clinical disputes about trans young people (social contagion / ROGD, desistance, detransition,
  "just exploring" / gender-exploratory therapy, puberty blockers): give the strongest sources on BOTH sides
  (e.g. Littman 2018 and its 2019 correction; critiques such as Turban et al. 2021; the Cass Review 2024 and the
  responses to it, e.g. the Yale Integrity Project / McNamara et al. 2024, the BMA's 2024 review statement, and
  WPATH SOC-8). Do not resolve the dispute; label it "contested".
- Mark each entry's verdict with one of: not supported · contested · a moral frame, not a finding · a political
  frame, not a finding · documented · the community's own word · half right.

THE WORDS (27)
same-sex attraction; unwanted same-sex attraction; the struggle; the lifestyle; ex-gay; overcomer; brokenness;
root causes; the wound; emotional dependency; gender confusion; reparative therapy; reintegrative therapy; SOGICE;
conversion practices; accountability partner; freedom, healing, restoration; affirming; gender ideology; social
contagion; desistance; detransition; just exploring; chosen family; born that way; legitimate needs; symptoms (mild,
moderate, severe).

THE REASONS (31), grouped as the networks grouped them
Men: a distant or rejecting father ("father hunger"); an overbearing, enmeshed mother; peer rejection / childhood
gender nonconformity ("gender esteem", "prehomosexual boy"); sexual abuse / "premature exposure"; unmet
"homoemotional" needs; fear of heterosexual men ("heterophobia"); a series of decisions / habit / sin; pornography,
masturbation, fantasy; media, schools, "gay activists", culture; spiritual causes (demons, sin); "biology,
environment and early development all play a role" (the softened version); trauma and "attachment loss" in clinical
dress; the four stages (confusion, filling the void, identity crisis, resolution) with "born this way" denied;
programme members' own survey of causes (2004).
Women: "the mother wound" / disidentification; sexual abuse as a path from femininity; emotional dependency /
enmeshment; a passive or unaffirming father; peer labelling / lack of friends who affirm femininity; fear of men;
feminism, women's colleges, "older lesbians"; a "narcissistic family system"; lesbianism as "an identity crisis";
"spiritual fallacy" (a distant picture of God).
Trans: "gender confusion" from family dynamics; trauma, abuse, mental-health conditions; peer influence, social
media, "social contagion"/ROGD; parent-child conflict; "gender ideology" in schools, media, law; homophobia as a
driver of trans identity; availability of puberty blockers as an explanation for rising referrals.

OUTPUT (one markdown file)
1. For each word, then each reason: a block with — Entry · Verdict · USE sources (1–3) · CLAIM sources (1–3) —
   each source as: Title — Publisher/Author — Date — exact URL (and archive timestamp) — ≤15-word quote — what it
   shows, in one line.
2. A final table of every URL you cite, one row each: URL · title · publisher · date · opened OK? (yes / paywalled /
   error) · used for which entries.
3. A short list of entries for which you could NOT find a good USE or CLAIM source, and why.
```
