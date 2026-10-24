STATUS: live

# VERIFY: the Support page's resources (S258, 2026-10-24)
*The lead's ask (2026-10-24): a plain Support page, "If this touched something for you", because a playtest found no
support resources anywhere in the piece. This file is the verification behind every line on that page
(`data/strings/support.json`). The piece itself stays offline; the checking below used the network once, on
2026-10-24, and nothing was fetched at runtime.*

**Method.** Each entry was read on the organisation's own site (WebFetch, 2026-10-24); web search was used only to find
the sites. The page text was read through a summarising fetch tool, so every address and number below was taken from
text the tool reported from the page (footer, contact page, service page) and cross-checked against a second page of
the same site or a Norwegian public portal where one existed. Where an organisation's own page did not confirm something,
it is listed under "Not verified" and does not appear on the page. Quotes are under 15 words and are the page's own.

**Printed form.** The Support page prints the short address (domain, or domain plus path where the service lives on a
deeper page). The "Verified page" column is the full address that was read.

## The list (9)

| # | Name (exact) | Printed address | Phone as printed | Verified page · date | Quote from its own page |
|---|---|---|---|---|---|
| 1 | **113 and Legevakt 116 117** (Helsenorge, the Norwegian public health portal) | helsenorge.no | 113 · 116 117 | https://www.helsenorge.no/en/psykisk-helse/mental-healthcare-for-adults-in-norway/ · 2026-10-24 | "If the situation is critical and about life or death, call 113." and "call the out-of-hours medical centre on 116 117" |
| 2 | **Hjelpetelefonen** (Mental Helse) | mentalhelse.no | 116 123 | https://mentalhelse.no/fa-hjelp/hjelpetelefonen/ · 2026-10-24 (also https://mentalhelse.no/, the home page lists "Alltid åpent") | "en gratis og døgnåpen telefontjeneste for alle som trenger noen å snakke med" |
| 3 | **FRI – foreningen for kjønns- og seksualitetsmangfold** | foreningenfri.no | 23 10 39 39 (weekdays 09:00–15:00) | https://foreningenfri.no/kontakt/ and https://foreningenfri.no/ · 2026-10-24 | "Stå opp for retten til å være fri" (its own tagline; the page lists the phone, e-mail post@foreningenfri.no, Mariboes gate 13, 0183 Oslo) |
| 4 | **Ungdomstelefonen** (run by Skeiv Ungdom) | ungdomstelefonen.no | 400 00 777 (phone Tue–Thu 18–22; chat Mon–Thu and Sun 18–22) | https://ungdomstelefonen.no/ · 2026-10-24 | "Vårt tilbud drives av unge frivillige mellom 18 og 30 år." |
| 5 | **Regnbuetelefonen** (Regnbuevenn) | regnbuevenn.no/regnbuetelefonen | 94 00 36 29 (weekdays 09:00–16:00) | https://www.regnbuevenn.no/regnbuetelefonen/ · 2026-10-24 | "landsdekkende telefonvenntilbud" (a nationwide phone-friend service) |
| 6 | **Skeivt kristent nettverk** | skeivtkristentnettverk.no | none listed | https://skeivtkristentnettverk.no/ and https://skeivtkristentnettverk.no/informasjon/snakke-med ("Trenger du noen å snakke med?") · 2026-10-24 | The talk page says SKN has no fixed counselling service but can put you in touch with someone from the network; e-mail post@skeivtkristentnettverk.no, and not to send sensitive information by e-mail. Footer: "Skeivt kristent nettverk" |
| 7 | **Skeiv Verden** | skeivverden.no | 950 93 293 | https://www.skeivverden.no/ and https://www.skeivverden.no/veiledning-og-terapi/ (linked "Få hjelp") · 2026-10-24 | "Skeiv Verden tilbyr alt fra terapi til veiledning" and "en nasjonal interesseorganisasjon for LHBTIQ+ personer med minoritetsbakgrunn" |
| 8 | **ILGA-Europe** | ilga-europe.org | none | https://www.ilga-europe.org/about-us/ and https://www.ilga-europe.org/about-us/membership/ · 2026-10-24 | "an independent, international non-governmental umbrella organisation" ; the membership page lists members by country |
| 9 | **Galop** (the LGBT+ anti-abuse charity, United Kingdom) | galop.org.uk | 0800 999 5428 (UK; the page's own tel link is +44 800 999 5428). Mon–Tue 9:15–20:00, Wed–Fri 9:15–16:30, closed 13:00–14:00 and at weekends | https://www.galop.org.uk/ and https://www.galop.org.uk/conversion-practices · 2026-10-24 | "Galop is here for you." (page lists the National Helpline for LGBT+ Victims and Survivors of Abuse and Violence) |

## Notes on what each entry does and does not claim
- **1.** Helsenorge is the public health portal, not an LGBTQ+ service; it is the page that states the emergency numbers.
  113 is for life-threatening situations; 116 117 (legevakt) is the out-of-hours doctor and was shown on the same page.
  The page says 116 117 for "less urgent" cases. The Support page says exactly that and nothing more about what they do.
- **2.** The page is in Norwegian only (no English information was found on it, so the Support page says the website is in
  Norwegian). Free, anonymous, open around the clock every day: all on the page. From abroad the page gives +47 911 16 123.
- **3.** FRI's own pages do **not** have a page about conversion therapy (checked 2026-10-24); the Support page therefore
  calls it a national organisation with a phone line, not a conversion-practices service.
- **4.** For people under 30 in practice (volunteers are 18–30; the page frames it as "young people"). The Support page
  says "young people".
- **5.** Targeted at loneliness and isolation per FRI's own page; the service page says it is for "lhbti+ personer og personer som lever med HIV".
- **6.** Relevant to people who were harmed inside religious settings. It is explicitly not a counselling service.
  The page does not mention conversion therapy and the Support page does not say it does.
- **7.** The page's footer lists the phone; counselling opening hours were not shown, so none are printed.
- **8.** ILGA-Europe is an advocacy network. Its pages do **not** offer support to individuals; the Support page says so and
  points to the membership list as a way to find an organisation in another country. Its own press release of 13.05.2026
  welcomes the European Commission's commitment to a Recommendation on ending conversion practices (seen on the home page;
  not used on the Support page).
- **9.** UK-based. Its homepage names conversion practices among the abuse it supports (the first fetch said so; a second
  fetch of the homepage showed only the "Conversion Practices" navigation link and a news item on the draft bill, and the
  conversion-practices page itself shows the helpline). So the Support page says "abuse and violence" and does not claim a
  conversion-therapy-specific service.

## The claim about the law (used in the page's text)
"Carrying out and marketing conversion therapy has been a criminal offence in Norway since 1 January 2024."
- Verified on **Ung.no** (the Norwegian public youth information portal), https://www.ung.no/oss/3EmAbx2OP6VWZ9DL0Y3aq3,
  2026-10-24: a jurist's answer dated 28.12.2023 says Parliament has passed new bans in the criminal code on carrying out
  and marketing conversion therapy, taking effect "1. januar 2024". Also https://www.ung.no/oss/fXPkeBhneNpvW1NHaQSBK9
  ("har Stortinget vedtatt et straffebud i straffeloven mot å utføre konverteringsterapi").
- Search results also pointed to Lovdata (lov 20. desember 2023 nr. 113, in force 1 January 2024) and Wikipedia; the Support
  page uses only the date and the two acts (performing, marketing), which the Ung.no pages state. Section numbers and
  penalties are **not** on the page.

## Not verified (so not on the page)
- **Kirkens SOS 22 40 00 40** — appears on Skeivt kristent nettverk's talk page, but Kirkens SOS's own site was not read.
- **Skeivchat (Helseutvalget), Sex og samfunn chat, HKS-chatten** — named on the Ung.no portal with chat hours; their own
  sites were not read.
- **Skeiv Ungdom's own site** and **Harry Benjamin Ressurssenter / Pasientorganisasjonen for kjønnsinkongruens** (trans
  services) — named on Ung.no; not read on their own sites. A trans-specific Norwegian service would be a worthwhile addition
  once one is checked.
- **A survivor-led peer network for conversion practices in Europe** — none could be found and verified. Search turned up
  Choices (Netherlands, https://choicescenter.nl/en/) and Switchboard (UK, https://switchboard.lgbt/) on the third-party
  site conversionpractices.com; their own pages were not read. No Norwegian survivor-specific service was found on an
  official page.
- **Bufdir** (the directorate) — no Bufdir page about the ban or about help was found.
- **English-language availability** of Hjelpetelefonen — a search snippet said so; the organisation's own page does not.
- **Any helpline's current opening hours beyond those printed above** — hours change; the page prints only those read on 2026-10-24.
