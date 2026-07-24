STATUS: live

# SOURCE VERIFICATION — results and required corrections (2026-07-24)
*Deep Research run by Sérgio against `CHATGPT_DEEPRESEARCH_SOURCE_VERIFICATION_2026-07-24.md`;
raw results at `~/Pc_Simulation/Sources/Deep Research/24:07:2026_DeepResearch.md`. This doc
converts them into **what must change in the build**. Per ETHICS_CONSTRAINTS #13/#14 no dossier
text or `status` has been edited — every correction below is prepared for Sérgio's approval.*

## Headline: every claim survived, but SIX need rewording
Nothing we assert is fabricated. But several claims are **imprecise in ways that matter for a
project whose whole ethic is citing accurately** — mostly over-claiming scope (a jury did more
than it did; a 2009 document covering more than it covers; "parents/schools" where the source says
parents). These are exactly the errors a provenance-centred piece cannot afford.

---

## ⚑ C1 — Ferguson v. JONAH: our claim conflates three legal stages
**Now:** *"a jury found the org's representations constituted consumer fraud; JONAH was barred from
representing sexual orientation as curable."*
**Problem:** the jury did NOT impose the bar. Three distinct stages:
1. **Pre-trial ruling** — the judge held that describing homosexuality as a mental illness/disorder
   and advertising unsupported success rates were prohibited misrepresentations.
2. **Jury, 25 June 2015** — found JONAH, Arthur Goldberg and counsellor Alan Downing liable under
   the NJ Consumer Fraud Act.
3. **December 2015 settlement + injunction** — JONAH's dissolution and the permanent restrictions.
**Proposed replacement (Sérgio approves/rewrites):** *"A New Jersey jury found JONAH's commercial
representations and practices fraudulent (25 June 2015), following a judicial ruling that
presenting homosexuality as a disorder and advertising unsupported change claims violated
consumer-protection law; a December 2015 settlement dissolved JONAH."*
**Status:** stays `documentary`. **Cites:** [NJ Appellate opinion](https://www.njcourts.gov/system/files/court-opinions/2019/fergusonvjonah.pdf) · [SPLC case docket](https://www.splcenter.org/resources/civil-rights-case-docket/michael-ferguson-et-al-v-jonah-et-al/)

## ⚑ C2 — APA: scope correction (2009 ≠ gender identity)
**Problem:** the 2009 task-force report and resolution concern **sexual-orientation** change
efforts. Our claim is phrased to cover SOGICE broadly. For a claim spanning orientation *and*
gender identity, cite the **2021** resolutions (there are two — SOCE and gender-identity change
efforts).
**Also:** the UK MoU has editions — **v1 (2015)** covered sexual orientation; **v2 (2017)**
expanded to gender identity. A historical card should name which edition it cites.
**Status:** stays `documentary` once scoped. **Cites:** [2009 task force](https://www.apa.org/pi/lgbt/resources/therapeutic-response.pdf) · [2021 SOCE](https://www.apa.org/about/policy/resolution-sexual-orientation-change-efforts.pdf) · [2021 GICE](https://www.apa.org/about/policy/resolution-gender-identity-change-efforts.pdf) · [MoU v2 2017](https://www.rcgp.org.uk/getmedia/4ac66d06-b013-4ff0-a471-63dbaecde0d9/RCGP-MoU-oct-2017.PDF)

## ⚑ C3 — van den Aardweg: "clinical instrument" overstates it
**Now:** *"a real clinical instrument."*
**Problem:** the "Anamnestic Questionnaire (Your Psychological History)" **is** real, in *The
Battle for Normality* (Ignatius Press, 1997) — but it is a self-history questionnaire inside his
self-therapy framework. **No psychometric validation, standardization, or recognition as a
diagnostic instrument was found.** Calling it clinical lends it borrowed authority — the exact
thing the piece critiques.
**Proposed:** *"a real self-history ('anamnestic') questionnaire published in van den Aardweg's
1997 self-therapy guide — presented as clinical, never validated as such."* That reads *better*
for us: the gap between presentation and validity is the point.
**Bonus:** actual item text is now available, so our two "direct quotes" can finally be checked —
e.g. *"For men: Did you as a boy play with soldiers, war toys, etc.? For women: Did you play with
dolls, stuffed animals?"* **Action:** diff our `origin_intake_e1.json` questions 1–2 against the
source text before shipping. **Status:** `documentary` for existence/authorship/items;
`contested` if described as validated. **Cite:** [Battle for Normality PDF](https://exgaycalling.com/wp-content/uploads/2020/03/Battle-For-Normality-The-Dr.-Gerard-van-den-Aardweg.pdf)

## ⚑ C4 — Love Won Out: our claim merges two different instructions
**Now:** *"instructing parents/schools to monitor a child's gendered behavior."*
**Problem:** the conference guide has a *"Prevention of Male Homosexuality"* session telling
**parents** to treat gender nonconformity as a warning sign (with "gentle disapproval," consequences,
and enlisting relatives/coaches/teachers) — and a **separate** session telling parents to scrutinize
**school curricula**. No instruction to *schools* to surveil individual children was found. We
merged the two.
**Proposed:** *"Love Won Out materials encouraged parents to treat childhood gender nonconformity
as a possible precursor to homosexuality and proposed corrective interventions; separate sessions
taught parents to scrutinize school curricula."* **Status:** `documentary` after the fix; the
broader "parents and schools were instructed to monitor children" wording would be `contested`.
**Cite:** [Love Won Out Conference Guide](https://upload.wikimedia.org/wikipedia/commons/a/ae/Love_Won_Out_Conference_Guide.pdf)

## ⚑ C5 — The pillow's "deeper feelings" gap is narrower than we thought
**Now:** the phrase *"continue until deeper feelings emerge"* is disclosed as unconfirmed.
**Finding:** the exercise is fully confirmed (Cohen's own *Coming Out Straight*, 2000; the
[Washington Post profile, 16 Aug 2005](https://www.washingtonpost.com/archive/lifestyle/wellness/2005/08/16/a-conversion-therapists-unusual-odyssey/8e1a190d-edc8-4914-b847-310098afed61/)
observed him demonstrating it with pillows, a tennis racket and repeated references to "Dad").
And the instruction *is* primary-sourced — Cohen writes to repeat the person's name **"until some
thoughts or feelings emerge."** Only the word **"deeper"** is a later embellishment.
**So:** use Cohen's documented wording; the disclosure shrinks from "we couldn't confirm the
instruction" to "the popularly-quoted *'deeper'* is not his word." **Sérgio: your framing of the
gap was right — it just gets more precise, and arguably more damning, since the real wording is
vaguer and therefore more open-ended.**

## ⚑ C6 — Truth in Love was a NEWSPAPER campaign, not a TV infomercial
**Problem:** our `s2_media.json` note treats the 1998 "Truth in Love" campaign as an echo for a TV
infomercial. It was principally **print** — the first full-page ad, *"Hope and Healing for
Homosexuals,"* ran in the **New York Times, 13 July 1998**, then WaPo, LA Times and others.
Robert Tilton's **Success-N-Life** is confirmed as the right *format* reference (prosperity-TV:
testimony, direct address, fundraising) — but it began in the early 1980s and was never a
conversion program. **Proposed:** describe "New You" as combining *Truth in Love*'s 1998 ex-gay
**message** with *Success-N-Life*'s prosperity-TV **format** — explicitly an authorial design
choice, not a historical claim. **Status:** `documentary` for both underlying facts.

---

## Confirmed clean (no change needed)
- **Flentje et al., 2013** — real, peer-reviewed, on-topic: *"Sexual Reorientation Therapy
  Interventions: Perspectives of Ex-Ex-Gay Individuals,"* **Journal of Gay & Lesbian Mental Health
  17(3): 256–277**, [DOI](https://doi.org/10.1080/19359705.2013.773268). Present as a self-selected
  qualitative sample, not a prevalence estimate.
- **"Guay" → James Guay** — identified: licensed therapist and survivor, placed in conversion
  therapy at sixteen; first-person account in [TIME, July 2014](https://time.com/2986440/sexual-conversion-therapy-gay/),
  corroborated by a [Ninth Circuit survivors' amicus brief](https://cdn.ca9.uscourts.gov/datastore/general/2013/02/04/13-15023_Amicus_brief_by_Survivors_of_Sexual_Orientation_Change_Efforts.pdf).
  **Action:** cite full name + exact passage; "Guay" alone is bibliographically insufficient.

## Update triggers — now groundable
- **u2 (1997→2003):** the vague "~2000 collapses of figureheads" resolves to a specific documented
  case — **John Paulk**, the public face of the 1998 campaign, photographed in a DC gay bar
  **19 Sept 2000**, removed as Exodus board chair **3 Oct 2000**.
  ⚠️ Do **not** say Exodus collapsed in 2000 — it did not. (Michael Johnston's 2003 withdrawal is a
  second, partially-confirmed case: closures documented, allegations reported not adjudicated.)
- **u3 (2003→2016):** **19 June 2013** — Chambers's apology and the board's closure decision, same
  day. Use the date, not "in 2013."
- **u4 (2016→now):** **Act LV of 2016**, passed December 2016, published **9 Dec 2016**, now
  **Chapter 567**. ⚠️ **Correction to my own earlier citation:** I gave the ILO NATLEX record as the
  primary; Deep Research flags it as ambiguously indexed. Use
  [Parliament of Malta Bill 167](https://www.parlament.mt/12th-leg/bills-12th/bill-no-167/) and
  [legislation.mt Chapter 567](https://legislation.mt/eli/cap/567/eng) instead. Bill materials may
  read "Act, 2015" (introduced then) — the enacted law is LV of 2016.
- **App removals:** ⚠️ **singular, not plural** — one app (Living Hope Ministries), pulled by
  **Apple 21 Dec 2018**, Microsoft ~Dec 2018, Amazon by 21 Mar 2019, **Google 28 Mar 2019**.
  Do not write "several conversion-therapy apps."

## Next actions
1. **Sérgio approves/rewrites C1–C6** (dossier wording is his).
2. A build session applies the approved text to `data/provotypes/pillow.json`,
   `origin_intake_e1.json`, `data/strings/updates.json`, `data/dialog/s2_media.json` — adding the
   URLs above, and clearing `[VERIFY SOURCE]` only where approved.
3. Diff the `origin_intake_e1.json` questions against van den Aardweg's real item text (C3).
4. Once cleared, these become the first **bright `documentary` nodes** in the Close constellation
   — the mechanism the schema was built for.
