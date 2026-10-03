STATUS: live

# VERIFY: one sourced sentence for each named organisation at the Close (ERA26-07, 2026-10-03)
*His ruling: "one sourced sentence". The 2026 constellation names five references from the gender-exploratory
field. A sentence ships only when its source is verified in the knowledge base; an unverified sentence never reaches
the player (check-spec forbids the marker in player-visible text).*

## Shipped (S209i): verified in `docs/research/E4_SOURCES_ai_2026-08-06.md`
| Label | Sentence | Source |
|---|---|---|
| **SEGM and Genspect (SPLC listing, 2024)** (was "SEGM-Genspect-GETA mesh": "mesh" claimed a link no source states, EVID-17) | In June 2024 the Southern Poverty Law Center listed Genspect and SEGM (the Society for Evidence-Based Gender Medicine) as anti-LGBTQ hate groups. Both dispute the listing, saying it suppresses legitimate debate. | LGBTQ Nation, June 2024; SEGM's response (KB lines 31, 73) |
| **SPLC detrans reporting** | The SPLC's Hatewatch reported how stories of detransition are used against trans people, and described detrans.ai as built on "reductive, anti-trans ideas and debunked pseudoscience". | SPLC Hatewatch, "Detransition narratives" (KB line 73) |

## Waiting on verification (no sentence shows until then)
Draft wording, to be corrected to what the sources actually say:

| Label | Draft sentence (unverified) | What needs checking |
|---|---|---|
| **GETA clinical guide 2022** | The Gender Exploratory Therapy Association published a clinician's guide in 2022 that recommends exploring a young person's gender distress in therapy before any medical transition; critics have compared the approach to conversion practices, which GETA rejects. | That the guide exists as named and dated; its own summary of its aim; a named critic's comparison; GETA's denial |
| **Genspect parent survey** | Genspect has published surveys of parents who doubt their children's trans identities; researchers have criticised parent-report studies of this kind for drawing on recruited, like-minded parents. | Which survey this label means (author, year, title); a published critique of its method |
| **detransition cohort study (Fenway)** | A 2021 study whose authors include researchers at the Fenway Institute found that most people who had detransitioned named outside pressures (family, stigma) among their reasons, not regret about being trans. | The paper (likely Turban et al., *LGBT Health*, 2021); the Fenway affiliation; the exact finding, in its own words |

## A Deep Research prompt for him (his verification loop)
> For each of the three items below, find the primary source and one independent, reputable source. Give the exact
> title, authors or organisation, year, and URL; quote the sentence that supports each claim; and say plainly if a
> claim cannot be supported. (1) The Gender Exploratory Therapy Association's 2022 clinical guide: what it is, what
> it recommends in its own words, whether named critics have compared gender-exploratory therapy to conversion
> practices, and GETA's response. (2) A "Genspect parent survey": which survey this is, who ran it, its method, and
> any published methodological critique. (3) The detransition study associated with the Fenway Institute (likely
> Turban et al., LGBT Health, 2021): its sample, its main finding about reasons for detransition, and the authors'
> affiliations.

When it is in, a model converts it into sentences, he ticks them, and they are applied word for word, as with the
other dossier sources.

---

## RESOLVED (S209j, 2026-10-03): his Deep Research is in
Source file: `~/Pc_Simulation/Sources/Deep Research/gate.md` (his run, 2026-10-03). Its verdicts, and what shipped:

| Label (as shipped) | Verdict | Sentence shipped | Source line shown |
|---|---|---|---|
| **GETA clinical guide 2022** | Documented; the *classification* is contested | In 2022 the Gender Exploratory Therapy Association (since renamed Therapy First) published a clinical guide recommending exploratory psychotherapy as the first approach for young people with gender distress; it says it favours no particular outcome. Florence Ashley argues the approach resembles conversion practices; Roberto D'Angelo, one of the guide's authors, rejects the comparison. | GETA, *A Clinical Guide for Therapists Working with Gender-Questioning Youth* (2022); Ashley, *Perspectives on Psychological Science* (2022); D'Angelo, *Journal of Medical Ethics* (2023) |
| **Genspect parents' survey (2025)** (was "Genspect parent survey") | Misdescribed: an assessment questionnaire devised by Hermes Postma and promoted by Genspect, not a published study. A separate 2024 survey by O'Malley has no published methods. No independent critique of either was found. | Genspect's Parents' Survey is a questionnaire families fill in about their child and give to clinicians. It is not a published research study, and we found no published validation of it. | Genspect, "The Genspect Parents' Survey: How It All Started" (2025) |
| **detransition study (Turban et al., 2021)** (was "detransition cohort study (Fenway)") | Documented, with the sampling qualifier: a secondary analysis of the 2015 U.S. Transgender Survey, not a Fenway cohort. The authors were at Stanford, the Fenway Institute, Harvard, BU and MGH. | Among 2,242 people in the 2015 U.S. Transgender Survey who said they had detransitioned at some point, 82.5% named at least one outside pressure, such as family or stigma. The survey included only people who still identified as trans or gender diverse. | Turban, Loo, Almazan and Keuroghlian, *LGBT Health* (2021); MacKinnon et al., *Bulletin of Applied Transgender Studies* (2022) |

**Ethics.** The clinical debate is kept unresolved: both the critic and the guide's author are named, and the guide's own "no particular outcome" is included. The 82.5% is never generalised to all detransitioners. No URLs were added to `links.json`; the source lines are names only.

### Rewritten the same day on his corrections (S209j)
- **GETA.** His question was "what is the point with this?" A neutral summary of a debate gave no reason for the reference to be in 2026's sky. The point is the word: the apparatus says "exploring" (the Lexicon's 2026 word of the day; "identity exploration" in her related searches), and the association has since renamed itself Therapy First, which is the Close message's "when a practice is banned by name, it changes its name". Shipped: *The word 2026 uses, "exploring", has a source: a 2022 guide by the Gender Exploratory Therapy Association made "exploratory psychotherapy" the first step for young people with gender distress. Critics such as Florence Ashley say it works like a conversion practice under a gentler name; its authors deny it. The association has since renamed itself Therapy First.* (Both positions are kept; the piece does not rule on the classification.)
- **Turban et al.** His correction: pausing or not finishing a transition is not the same as questioning yourself. Every respondent still identified as trans, and "gender affirmation" was broadly defined, social steps included. So the study measures transitions interrupted by pressure, which is exactly what the 2026 apparatus counts as "second thoughts". Shipped: *Second Thoughts counts every stop as a change of mind. This study counted 2,242 trans and gender-diverse people who had paused or stopped a transition, social or medical, at some point: 82.5% named an outside pressure, such as family, stigma or safety. All of them still identified as trans. It measures transitions interrupted by pressure, not people who stopped being trans.*
