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

---

# S259 additions (2026-10-24): international, Europe, Portugal
*The lead's ask: not Norway-only, because the piece will travel to festivals. Page sections are now: danger now, Europe,
International, Norway (entries 1-7 above, unchanged), Portugal. Same method as above (own sites read with WebFetch on
2026-10-24; search only to find them). The fetch tool summarises pages, so figures are as the tool reported them; where a
site could not be read by the tool (JavaScript-only or blocked) that is stated. Quotes are under 15 words.*

## The new entries (page total 20)

| # | Section | Name (exact) | Printed address | Phone as printed | Verified page, date | Quote from its own page |
|---|---|---|---|---|---|---|
| 10 | Danger now | **Find A Helpline** (ThroughLine) | findahelpline.com | none | https://findahelpline.com/ and https://findahelpline.com/about, 2026-10-24 | "to ease every emotional crisis, globally"; "Verified data, maintained daily" |
| 11 | Danger now (the general line, not an organisation) | **112**, EU emergency number | none printed (the line says "Call your local emergency number") | 112 (named in the line) | https://europa.eu/youreurope/citizens/travel/security-and-emergencies/emergency/index_en.htm, 2026-10-24 | "112 is the European emergency number you can dial free of charge" |
| 12 | Europe | **TGEU** (Trans Europe and Central Asia) | tgeu.org/our-members | none | https://tgeu.org/ and https://tgeu.org/our-members/, 2026-10-24 | "We provide direct support to our members" (members page: "Member organisations by country") |
| 13 | International | **Rainbow Railroad** | rainbowrailroad.org/request-help | none (its page lists none) | https://www.rainbowrailroad.org/ and https://www.rainbowrailroad.org/request-help, 2026-10-24 | "We help at-risk LGBTQI+ people get to safety." |
| 14 | International | **ILGA World** | ilga.org/member-organisations | none | https://ilga.org/ and https://ilga.org/member-organisations/, 2026-10-24 | "global federation of more than 2,300 member organisations" |
| 15 | International | **The Trevor Project** (United States only) | thetrevorproject.org/get-help | 1-866-488-7386 and text 678-678 | https://www.thetrevorproject.org/get-help/, 2026-10-24 | "from anywhere in the U.S via text, chat, or phone" |
| 16 | Portugal | **SNS 24, psychological counselling** | sns24.gov.pt | 808 24 24 24 (press 4) | https://portugal.gov.pt/gc23/comunicacao/noticias/linha-de-apoio-psicologico-do-sns-24-ja-atendeu-mais-de-240-mil-chamadas (Government of Portugal portal, 2023) and https://ilga-portugal.pt/associacao/contactos/, 2026-10-24 | "disponível 24 horas por dia, 7 dias por semana" |
| 17 | Portugal | **Linha 1411** (national suicide prevention line) | portugal.gov.pt (announcement of 10 September 2025) | 1411 | https://portugal.gov.pt/gc25/comunicacao/noticias/nova-linha-de-prevencao-do-suicidio-entra-em-funcionamento, 2026-10-24; 24 h and free also from https://ilga-portugal.pt/associacao/contactos/ | "assegurada por psicólogos e enfermeiros especialistas" |
| 18 | Portugal | **SOS Voz Amiga** | sosvozamiga.org | 213 544 545 and 912 802 669 (the page also lists 963 524 660, 930 712 500) | https://www.sosvozamiga.org/ and https://www.sosvozamiga.org/contactos, 2026-10-24 | "Diariamente das 15h30 às 00h30."; motto "Ligue-nos. Nós escutamos." |
| 19 | Portugal | **ILGA Portugal** | ilga-portugal.pt/associacao/contactos | 969 239 229 (Linha de Apoio LGBTI+, Thu-Fri 20:00-23:00; the page also lists 218 873 922) and 927 247 468 (Serviço de Apoio à Vítima LGBTI+, Mon-Fri 09:30-16:30) | https://ilga-portugal.pt/associacao/contactos/, https://ilga-portugal.pt/ and /morada-e-horario, 2026-10-24 | Its own headings "Serviço de Apoio à Vítima LGBTI+" and "Linha de Apoio LGBTI+" |
| 20 | Portugal | **Casa Qui** | casa-qui.pt | 96 008 11 11 | https://www.casa-qui.pt/, 2026-10-24 | its Gabinete de Apoio à Vítima serves "lésbicas, gays, bissexuais, trans ou intersexo vítimas" |
| 21 | Portugal | **Opus Diversidades** | opusdiversidades.org (redirects to rainbowportal.opusdiversidades.org) | 924 467 485 | https://rainbowportal.opusdiversidades.org/sobre-nos/ and /contactos/, 2026-10-24 | "Consultas de Psicologia gratuitas" |

Page count: danger-now directory 1 (entry 10); Europe 3 (ILGA-Europe and Galop from the list above, plus TGEU);
International 3 (13, 14, 15); Norway 7 (entries 1-7 above, 113/116 117 first); Portugal 6 (16-21) = 20.

## Notes on what each new entry does and does not claim
- **10.** A directory run by ThroughLine Limited; it says it works with helplines in "175+ countries" and lists "Gender &
  sexual identity" as a topic. It is not a helpline. Its privacy/tracking behaviour was not read; the piece never loads it
  (the address is printed as text only).
- **11.** europa.eu: 112 "you can dial free of charge from fixed and mobile" phones, and "the only number you can use to
  access the emergency services in all EU countries and many other countries". The page says "Call your local emergency
  number" first because the visitor may be anywhere.
- **12.** TGEU's own members page says it supports members, not individuals. The page says that plainly.
- **13.** Its request page is for people who "identify as LGBTQI+" who need support to be safer; it is a form (it asks for an
  e-mail address and date of birth to open a request) and gives **no** emergency instructions or phone. The Support page says
  "not an emergency line". How fast it answers is not on the page; none is claimed.
- **14.** ILGA World describes itself as a federation / umbrella; no individual services are described, so the Support page
  says it campaigns rather than offers support. The members page is by region then country (it is not a search tool).
- **15.** Its own pages say the services are "nationwide" and reachable "from anywhere in the U.S."; the home page links a
  separate Trevor Project Mexico site (thetrevorproject.mx, not read). The Support page therefore labels it United States
  only and says it is not international. The number and text short code are the ones its page gives; "988" was not on the
  page and is not printed.
- **16.** The Government of Portugal portal page (2023-09-04) gives 808 24 24 24, "option 4", 24/7; ILGA Portugal's own
  contacts page lists the same ("808 24 24 24: SNS 24 for psychological counselling. Press 4"). sns24.gov.pt itself is a
  JavaScript-only page the fetch tool could not read (it returned only the title "SNS 24"), so the printed address is the
  service's official domain as named by the government page and search results, not text read from that page. A search
  summary said English-language support exists; that was not read from the page and is **not** on the Support page.
  It is a health service, not LGBTQ+-specific; the Support page says so.
- **17.** The portal page says it is staffed by psychologists and specialist nurses, integrated with SNS 24 but autonomous,
  coordinated by SPMS. The Support page prints "free ... open at every hour" because ILGA Portugal's list marks it free
  and 24 h and SOS Voz Amiga's page lists "1411 ... 24 hours"; the portal page itself did not state hours or cost. It was
  created by Lei n.º 17/2024 per a search summary (not on the page, not printed). Not LGBTQ+-specific.
- **18.** The page says people can talk "em anonimato". Not LGBTQ+-specific. Website in Portuguese only.
- **19.** ILGA Portugal is both advocacy and a service. Its contacts page lists the two services and hours exactly as
  printed. The Linha de Apoio is described there as "listening, information, and support for LGBTI+ people, their families,
  close contacts, and professionals". The victim-support number is a mobile number. In-person visits are by appointment only
  (not printed). The pages read did not mention conversion practices.
- **20.** A social-solidarity association; the GAV supports LGBTI people who are victims of bullying, domestic or family
  violence, or being expelled from home. No hours or e-mail were on the page read. Not read: its /index.php/contactos page.
- **21.** Phone-line hours "10:00-18:00 on weekdays" are from the Rainbow Portal "Sobre nós" page. **Hours and addresses
  conflict across Opus's own pages** (its contacts page: Mon-Wed 09:00-17:00, Thu-Fri 12:00-20:00; the main site another set;
  two street addresses on the two sites), so the Support page prints only the phone-line hours from the one page that
  states them, and no address. Services (free psychology consultations, social support, legal support) and booking by phone
  or e-mail are from that page; its e-mail address is obfuscated in the page text and is not printed.

## The Portugal law (used in the page's law sentence)
"Practices aimed at forced conversion of sexual orientation, gender identity or gender expression have been a crime in
Portugal since 1 March 2024 (Lei n.º 15/2024, de 29 de janeiro)."
- **Law:** Lei n.º 15/2024, de 29 de janeiro, Diário da República, 1.ª série, n.º 20, 29 January 2024 (publication data from
  a vLex page; number and date also on the Government equality commission's page,
  https://www.cig.gov.pt/2024/01/portugal-proibe-praticas-de-conversao-forcada-da-orientacao-sexual/, read 2026-10-24,
  which names Lei n.º 15/2024 and says penalties run to three years or a fine, to five years where irreversible bodily
  changes are caused). It amends Lei n.º 38/2018 (7 August) and the Penal Code. Approved by Parliament in December 2023,
  promulgated 20 January 2024 (DN, RR; secondary).
- **In force: 1 March 2024.** Source: Observador, 1 March 2024, "Lei contra práticas de conversão forçada da orientação
  sexual entra em vigor esta sexta-feira" (read: "esta sexta-feira", published 1 March 2024); DNoticias of 1 March 2024 reports
  the same. **The official Diário da República page (diariodarepublica.pt/dr/detalhe/lei/15-2024-839477377) is JavaScript-only
  and could not be read by the fetch tool**, so the entry-into-force article was not read at its source; a search summary says
  the text enters into force "no primeiro dia do segundo mês seguinte à sua publicação", which matches 1 March. Treat the date
  as verified from two news reports, not from the gazette text.
- **Wording.** The law's own word is "conversão forçada" (forced conversion); the Support page keeps it rather than saying
  all conversion therapy is banned.
- **Context, not on the page.** In March-April 2026 petitions in the Portuguese Parliament asked for the law's repeal
  (petição n.º 125/XVII/1) and a counter-petition opposed that (Sábado, Observador, April 2026). No repeal or vote was found.
  Re-check before each venue.

## Not verified (so not on the page), S259
- **rede ex aequo** (youth association): rea.pt returned HTTP 500 on 2026-10-24, so its own site could not be read. Search
  results from its own published PDFs give "Rua dos Fanqueiros, nº38, 3º Esq, Lisboa" and geral@rea.pt; **not printed.** It
  is a youth association (16-30) with school sessions, not a helpline.
- **Switchboard (UK LGBT+ helpline)**: its own site switchboard.lgbt answered HTTP 403 to the fetch tool and to curl, so it
  could not be read; **not printed.** (Galop covers the UK.)
- **SNS 24's own site**: JavaScript-only; number confirmed on the Government of Portugal portal and on ILGA Portugal instead.
- **Opus Diversidades' hours and address**: conflicting across its own pages (entry 21).
- **Casa Qui's e-mail, address and hours**: not on the page read.
- **ILGA-Europe's own contact address**: its home page gives only a contact form; the page prints the domain.
- **Trevor Project outside the US**: nothing on its pages describes a non-US service except a link to the Mexico site.
- **A survivor-led conversion-practices network in Europe, a trans-specific Norwegian service, Choices (NL)**: still not read.
- **Opening hours of any line** may have changed since 2026-10-24.

## Added 2026-10-27 (his yes: a trans-specific Norwegian service and Kirkens SOS)
Same method: each organisation's own page, read in the built-in browser on 2026-10-27. Norway now has 9 entries; the
page has 22.

| # | Section | Name (exact) | Printed address | Phone as printed | Verified page · date | Quote from its own page |
|---|---|---|---|---|---|---|
| 22 | Norway | **Kirkens SOS** | kirkens-sos.no | 22 40 00 40 | https://www.kirkens-sos.no/ and https://www.kirkens-sos.no/telefon · 2026-10-27 | "Telefonnummeret til vår krisetelefon er: 22 40 00 40." · "Telefonen vår er døgnåpen hver dag" · "Deres oppgave er ikke å forkynne eller gi råd, men å lytte" · "landets største døgnåpne krisetjeneste på telefon og nett, bemannet av frivillige" |
| 23 | Norway | **HKS-chatten** (PKI and Helsestasjonen for kjønn og seksualitet) | hksoslo.no/chat | none | https://pkinorge.no/ (its link "Ta kontakt med HKS-chatten" → https://www.hksoslo.no/chat) · 2026-10-27 | "PKI driver HKS-chatten i samarbeid med Helsestasjonen for Kjønn og Seksualitet i Oslo." · "prate anonymt med fagpersoner med sexologisk videreutdanning eller transkompetanse" · "Mandag 17:00 - 20:00 / Torsdag 17:00 - 20:00" · PKI: "En pasientorganisasjon for personer med kjønnsinkongruens og deres familie og nære." |

- **22.** The name means "the Church's SOS". Its "Om" page does not state its church link in a sentence, so the printed
  line does not claim one; it quotes only what the service says it does (listen, not preach or advise). A church-named
  service on this page is the lead's call; its own home page carries an affirming article about a Christian lesbian
  woman ("Redd for å velge kjærligheten"). Calls limited to three per day (its page).
- **23.** https://www.hksoslo.no/chat also read on 2026-10-27: "Fagfolk svarer på alle typer spørsmål om kjønn.", the same
  hours ("Mandag 17:00 - 20:00", "Torsdag 17:00 - 20:00"), "Du er anonym når du chatter med oss." Trans-specific: PKI describes itself as being for people with gender incongruence and their families.
