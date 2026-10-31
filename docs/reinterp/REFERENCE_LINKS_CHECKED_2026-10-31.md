STATUS: live

# Reference links checked, 2026-10-31

Checked on 2026-10-31 for the article on SOGICE as visual and interface culture. Short sentences on purpose.
Screenshots: `/Users/sergiogalvaoroxo/update-available-reinterp/output/reference-shots-2026-10-31/` (never committed). Script: `out/probes/refshots.mjs`. Raw results: `results.json` in the same folder.
Each screenshot is the first 2400 px at 1280 wide. Wayback captures show the Wayback toolbar in the top 65 px. That bar is not part of the period page.

## 1. Summary

- The list has 38 links. 30 work (link 18 only over plain http). 3 are blocked to my automated browser (3, 4, 5). 5 fail: four give 503 (6, 8, 9, 14) and one PDF is not found (35).
- I did not get past bot checks or cookie banners. I did not click anything.
- I added 5 more pages: the 3rd mirror page (39) and his 4 earlier finds (40 to 43). All 5 work.
- I found and shot 19 ministry-site captures (44 to 62). All 19 load. A few have little content.
- Only NARTH has a true 1997 homepage capture. Exodus has none before 1999 in the domains I tried. See section 3.
- The 10 best references for the article:
  1. 40 Regeneration Books catalogue at Exodus NA, 2001 (left category menu).
  2. 43 "Mom" ad script with the end card and phone number, 2001.
  3. 42 "Truth in Love" ads page, 2001 (video badges, call line).
  4. 62 Exodus home, 2004 (group photo as proof).
  5. 53 Exodus home, 2003 (portrait photos, image-button menu).
  6. 56 Love in Action home, 2003 (strip of smiling faces).
  7. 44 NARTH home, 1997 (clinical look, "NEW" gifs).
  8. 41 Ex-gay link list (colour legend, web rings, 2003 material).
  9. 59 PFOX home, 2003 ("best viewed", tell-a-friend form).
  10. 18 Web survey of the movement, Summer 2000 (a contemporary outside view).
  Also strong for the ad story: 38 and 16 (catalogue of ads), 24 (parody billboard).

## 2. All links checked

Type words: period capture, archive collection, contemporary article, later research, PDF. "Works" means the page loaded with HTTP 200. Dates marked "from URL" or "from list" come from the link or its label, not from the page. Links 1 to 38 are from his list, in his order. 39 to 43 are the extra pages. 44 to 62 are my Wayback finds (exact URLs also in section 3).

| # | exact URL | type | date of material | works? | screenshot file | what it shows | use |
|---|---|---|---|---|---|---|---|
| 1 | https://web.archive.org/web/20050322172728/http://www.exodusglobalalliance.org/ourhistoryc87.php | period capture | capture 2005-03-22 | Works. HTTP 200 | 01_exodus-global-alliance-2005.png | "Our History" timeline page of a ministry network. Cream left menu, orange banner, long text. | article |
| 2 | https://web.archive.org/web/20021107172717/http://www.exodusnorthamerica.org/findministry/ministries/a0001123.html | period capture | capture 2002-11-07 | Works. HTTP 200 | 02_exodus-regional-ministry-200.png | "Find A Ministry" record for one local ministry. Bridge photo, plain data block in monospace, small footer menu. Broken banner image. | piece's look |
| 3 | https://americanhistory.si.edu/collections/archival-collection/sova-nmah-ac-1428 | archive collection | not stated [VERIFY SOURCE] | BLOCKED 403 (bot check, not bypassed). Page not seen. | 03_love-in-action-smithsonian-c.png | Bot-check page only. | context only (check by hand) |
| 4 | https://www.americanhistory.si.edu/press/releases/national-museum-american-history-acquires-archival-collection-related-lgbt | contemporary article (press release) | not stated [VERIFY SOURCE] | BLOCKED 403 (bot check, not bypassed). Page not seen. | 04_smithsonian-collection-annou.png | Bot-check page only. | context only (check by hand) |
| 5 | https://findingaids.library.upenn.edu/records/HAVERFORD_HC.MC.1351 | archive collection (finding aid) | not stated [VERIFY SOURCE] | BLOCKED in browser (500 "URL blocked"). Plain curl HEAD gave 200. Page not seen. | 05_peterson-toscano-collection.png | "Blocked" message only. | context only (check by hand) |
| 6 | https://lgbtqreligiousarchives.org/collections/bogle-darlene-papers | archive collection | not stated [VERIFY SOURCE] | FAIL 503 Service Unavailable (browser and curl, 2026-10-31) | 06_darlene-bogle-collection.png | Error page. | context only (retry later) |
| 7 | https://oac.cdlib.org/findaid/ark:/13030/c8m04cdj/ | archive collection (finding aid) | papers 1980-2005 (page title) | Works. HTTP 200 | 07_darlene-bogle-finding-aid.png | Finding aid for one collection. Plain text, box list. | context only |
| 8 | https://lgbtqreligiousarchives.org/collections | archive collection | not stated | FAIL 503 Service Unavailable | 08_lgbtq-religious-archives-net.png | Error page. | context only (retry later) |
| 9 | https://lgbtqreligiousarchives.org/collections/mattachine-society-of-washington-love-in-action-collection | archive collection | not stated | FAIL 503 Service Unavailable | 09_love-in-action-collection-de.png | Error page. | context only (retry later) |
| 10 | https://mattachinesocietywashingtondc.org/2017/07/25/conversion-therapy-papers-from-largest-ex-gay-conversion-ministry-donated-to-the-smithsonians-national-museum-of-american-history-by-the-mattachine-society-of-washington-dc/ | later research (blog post) | post dated 2017-07-25 (from URL) | Works. HTTP 200 | 10_mattachine-donation-of-handb.png | Short blog post about a donation of handbooks. Photos, plain blog layout. | context only |
| 11 | https://sirismm.si.edu/EADpdfs/NMAH.AC.1146.pdf | PDF | see list label | 200, application/pdf, 937245 bytes (plain curl; a curl call with a browser-style User-Agent got "Request Rejected") | none (PDF) | PDF not opened | context only |
| 12 | https://americanhistory.si.edu/sites/default/files/lgbtq_archives_center.pdf | PDF | see list label | 200, application/pdf, 297946 bytes | none (PDF) | PDF not opened | context only |
| 13 | https://clgs.psr.edu/research/clgs-archives-project/ | later research (project page) | not stated | Works. HTTP 200 | 13_clgs-archives-project.png | Project page of a research centre. Text and menu. | context only |
| 14 | https://lgbtqreligiousarchives.org/collections/presbyterians-united-for-biblical-concerns-records | archive collection | not stated | FAIL 503 Service Unavailable | 14_presbyterian-subject-files-e.png | Error page. | context only (retry later) |
| 15 | https://www.thefrugalgamer.net/archived/ReligiousTolerance/hom_evan.htm | later research (essay, mirrored) | essay 1998-2013 (page footer on sister page) | Works. HTTP 200 | 15_religioustolerance-mirror-mi.png | Long essay "Changing gays and lesbians". Page shows a huge text menu first (page-wide list), then the essay. A Norwegian Google Translate bar sits on top. No web ring visible in the first 2400 px. | context only |
| 16 | https://www.thefrugalgamer.net/archived/ReligiousTolerance/hom_ads1.htm | later research (essay, mirrored) | ads 1998-1999; essay revised later | Works. HTTP 200 | 16_religioustolerance-mirror-ad.png | Part 1 of the ads essay. Unstyled mirror: menu as bare list, then text listing the 15 groups behind the 1998 newspaper ads. | article (ad history); context |
| 17 | https://gould.usc.edu/assets/docs/Controlling_Desires.pdf | PDF | 1999 (from list label) [VERIFY SOURCE] | 200, application/pdf, 2362975 bytes | none (PDF) | PDF not opened | article (historic ministry URLs) |
| 18 | https://www.pinktriangle.org.uk/glh/194/webwatch.html | contemporary article | created 2000-07-23, updated 2007-12-12 (page footer) | HTTPS FAILS (certificate name error). Plain http works. Screenshot is of the http URL. | 18_contemporary-web-survey.png | Web survey of the ex-gay movement. Pink page, yellow text box, cyan "See also" box, lists of sponsor groups for and against. | article |
| 19 | https://www.christianitytoday.com/1998/09/ad-campaign-ignites-firestorm/ | contemporary article | 1998-09 (from URL) | Works. HTTP 200. Cookie banner covers the page; not clicked. | 19_1998-ad-campaign-report.png | Magazine page. Banner on top; article image behind it. | article (text); look: none |
| 20 | https://www.christianitytoday.com/1999/09/tv-stations-turn-down-exodus-ads/ | contemporary article | 1999-09 (from URL) | Works. HTTP 200. Cookie banner covers the page; not clicked. | 20_1999-television-ads-report.png | Same layout as 19. | article (text) |
| 21 | https://www.dignityusa.org/articles/gay-catholics-denounce-latest-round-of-ex-gay-ads | contemporary article | 1998 (from title in list) | Works. HTTP 200 | 21_1998-dignityusa-response.png | Short news-style page from a Catholic LGBT group. Plain text. | article |
| 22 | https://www.sfgate.com/news/article/retort-to-ad-god-made-me-gay-3074668.php | contemporary article | 1998 (from list) | Works. HTTP 200. Privacy dialog covers the top; not clicked. | 22_1998-newspaper-coverage.png | Newspaper site. Text below the dialog is readable: an interview day about a full-page ad. | article |
| 23 | https://www.myplainview.com/news/article/Billboards-encourage-questioning-of-homosexuality-8485224.php | contemporary article | 2005 (from list) | Works. HTTP 200 | 23_2005-houston-billboard-repor.png | Local newspaper page about billboards. | article |
| 24 | https://justinsomnia.org/2005/09/question-intolerance/ | contemporary article (blog) | posted 2005-09-19 (page) | Works. HTTP 200 | 24_2005-billboard-parody.png | Blog post. Photo of a parody billboard, update boxes, 166 comments. | article (shows how the ad was copied and fought back) |
| 25 | https://justinsomnia.org/2006/03/a-response-to-liberty/ | later research / blog | 2006-03 (from URL) | Works. HTTP 200 | 25_2006-parody-legal-response.png | Long blog post and comments. Legal response to a cease-and-desist letter. | context only |
| 26 | https://justinsomnia.org/2006/03/the-viral-parody/ | later research / blog | 2006-03 (from URL) | Works. HTTP 200 | 26_2006-parody-variants.png | Gallery of parody images. | context only |
| 27 | https://www.boxturtlebulletin.com/2007/02/12/220 | contemporary article (blog) | 2007-02-12 (from URL) | Works. HTTP 200 | 27_love-won-out-2007-attendance.png | Blog report on a conference. Green header, left sidebar. | context only |
| 28 | https://www.boxturtlebulletin.com/2007/02/15/224 | contemporary article (blog) | 2007-02-15 (page) | Works. HTTP 200. An ad overlay (not clicked) covers the middle. | 28_love-won-out-report-part-1.png | Blog report, part 1. Green turtle header, left menu, long text. | context only |
| 29 | https://www.boxturtlebulletin.com/2007/04/12/290 | contemporary article (blog) | 2007-04-12 (from URL) | Works. HTTP 200 | 29_love-won-out-report-part-4.png | Blog report, part 4. | context only |
| 30 | https://www.boxturtlebulletin.com/2007/11/12/1001 | contemporary article (blog) | 2007-11-12 (from URL) | Works. HTTP 200 | 30_love-won-out-video-post-nove.png | Blog post with embedded video. I did not download or play the video. | context only |
| 31 | https://www.boxturtlebulletin.com/2007/11/05/975 | contemporary article (blog) | 2007-11-05 (from URL) | Works. HTTP 200 | 31_love-won-out-video-post-nove.png | Blog post with embedded video. Not played. | context only |
| 32 | https://www.boxturtlebulletin.com/2008/02/26/1490 | contemporary article (blog) | 2008-02-26 (from URL) | Works. HTTP 200 | 32_love-won-out-2008-report.png | Blog post. Page title does not match the list label "2008 report" (it says low turnout). | context only [VERIFY SOURCE] |
| 33 | https://www.boxturtlebulletin.com/2006/09/25/91 | contemporary article (blog) | 2006-09-25 (from URL) | Works. HTTP 200 | 33_2006-palm-springs-vigil.png | Blog post. Page title ("Why Activism?") does not obviously match the list label "Palm Springs vigil". | context only [VERIFY SOURCE] |
| 34 | https://www.boxturtlebulletin.com/2007/02/28/234 | contemporary article (blog) | 2007-02-28 (from URL) | Works. HTTP 200 | 34_2007-conference-context.png | Blog post about a large Christian media group. | context only |
| 35 | https://www.sjsu.edu/people/james.lee/courses/soci172/s0/Conversion-Therapy.pdf | PDF | 2010 (from list label) | FAIL: 300 Multiple Choices, "document could not be found" (text/html, no PDF) | none (PDF) | PDF not opened | drop (link dead) |
| 36 | https://pdfs.semanticscholar.org/8011/bf86a4e55eefe42fa0334391212cf1e629f8.pdf | PDF | see list label | 200, application/pdf, 7210037 bytes | none (PDF) | PDF not opened | article (billboard image comparison); check by hand |
| 37 | https://www.aclu.org/wp-content/uploads/document/asset_upload_file906_30454.pdf | PDF | see list label | 200, application/pdf, 1507822 bytes | none (PDF) | PDF not opened | context only |
| 38 | https://www.thefrugalgamer.net/archived/ReligiousTolerance/hom_ads.htm | later research (ad catalogue, mirrored) | text 1998-2013 (footer: updated 2013-06-17) | Works. HTTP 200 | 38_ex-gay-advertising-catalogue.png | Overview of ex-gay ads. Left menu of categories in blue bars, centre column, search box, buttons. Rendered with a Norwegian Google bar on top. | article (the left-nav catalogue look); piece's look |
| 39 | https://www.thefrugalgamer.net/archived/ReligiousTolerance/hom_ads2.htm | later research (ad catalogue, mirrored) | 1999 ads, later essay | Works. HTTP 200 | 39_mirror-hom-ads2.png | Part 2: reactions to the ads. Unstyled in my capture (menu as bare list), text starts low. | context only |
| 40 | https://web.archive.org/web/20010605015624/http://www.exodusnorthamerica.org/resources/ | period capture | capture 2001-06-05 | Works. HTTP 200 | 40_exodus-na-resources-2001.png | Book catalogue "Regeneration Books". Dark blue left menu "Browse" with 16 categories, book covers in a list, side ads. Copyright 2000. | article; piece's look (best catalogue example) |
| 41 | https://web.archive.org/web/20080516071642/http://geocities.com/exgaylinks/links.html | period capture (of a page last edited 2003) | capture 2008-05-16; page text says "as of 4-23-2003" | Works. HTTP 200 | 41_exgaylinks-geocities-2008.png | Huge hand-made link list. Legend of colour icons, table of contents, long lists by country and US state. Shows web rings and mail lists as headings. | article; piece's look (2003 link-list culture) |
| 42 | https://web.archive.org/web/20011204191826/http://www.cwfa.org/library/family/truthinlove/ | period capture | capture 2001-12-04; material from 1999 TV ads | Works. HTTP 200 | 42_cwfa-truthinlove-2001.png | Campaign page "Truth in Love": maroon top menu, blue bar with a slogan, striped yellow sides. Two video stills, Real Player badges, a phone line to call, list of supporting groups. | article; piece's look |
| 43 | https://web.archive.org/web/20011126031813/http://www.cwfa.org/library/family/truthinlove/mom.shtml | period capture | capture 2001-11-26; material from 1999 | Works. HTTP 200 | 43_cwfa-mom-2001.png | Script of one TV ad as a two-column table (On Screen / Audio). Last row is an end card with a phone number on black. | article (end card with phone number) |
| 44 | https://web.archive.org/web/19971222054508/http://narth.com/ | period capture | 1997-12-22 (page: "Updated 12 November 1997") | Works. HTTP 200. | 44_cap_narth_199712.png | NARTH home. Grey textured background, centred coin logo, long list with gold-ball bullets, two "NEW" starburst gifs, postal address, phone, email at foot. | article; piece's look (1997 best) |
| 45 | https://web.archive.org/web/19981212030643/http://www.loveinaction.org/ | period capture | 1998-12-12 (page: (c) 1997) | Works. HTTP 200. | 45_cap_loveinaction_199812.png | Love in Action. Cream parchment background, red inverted triangle with a heart, grey small caps, one big blue link: "Click here to continue." A splash page. | article; piece's look (1997 splash) |
| 46 | https://web.archive.org/web/19981111184246/http://pfox.org/ | period capture | 1998-11-11 | Works. HTTP 200. | 46_cap_pfox_199811.png | P-FOX. White page, centred bold text, many broken images shown as "[IMAGE]", green LED hit counter at bottom left. | piece's look (1997 plain page + counter) |
| 47 | https://web.archive.org/web/19990417133357/http://www.exodusintl.org/ | period capture | 1999-04-17 | Works. HTTP 200. | 47_cap_exodusintl_199904.png | Exodus home (early). Light yellow page, one logo, two rainbow-coloured rules, plain bullet list with phone/fax and "Booklets". A "Version of 10/31/2026" line is a script artefact, not period. | piece's look (1997 text page); caution |
| 48 | https://web.archive.org/web/20000115202914/http://www.newdirection.ca/ | period capture | 2000-01-15 | Works. HTTP 200. | 48_cap_newdirection_200001.png | New Direction (Canada). White page, black/green logo, green bold centred text, flag, text links in a footer row ("Common Questions | Telling Our Stories ..."). | piece's look (late 90s) |
| 49 | https://web.archive.org/web/20000620111744/http://www.exodusnorthamerica.org/ | period capture | 2000-06-20 | Works. HTTP 200. Little content. | 49_cap_exodusna_200006.png | Exodus North America. Capture has very little text (206 characters). Not viewed. | context only (check by hand) |
| 50 | https://web.archive.org/web/20010801142452/http://www.evergreeninternational.org/ | period capture | 2001-08-01 | Works. HTTP 200. Little content. | 50_cap_evergreen_200108.png | Evergreen (first capture). Small text. Page title is "dot com biz card" (odd). Not viewed closely. | drop / check by hand |
| 51 | https://web.archive.org/web/20001109193700/http://www.peoplecanchange.com/ | period capture | 2000-11-09 (extra domain) | Works. HTTP 200. | 51_cap_peoplecanchange_200011.png | People Can Change. Teal background, dark blue bold text, boxed table with a left menu of broken button images, long testimony-style text. | piece's look (plain testimony page) |
| 52 | https://web.archive.org/web/20001204180900/http://www.exodusinternational.org/ | period capture | 2000-12-04 (extra domain) | Works. HTTP 200. Little content. | 52_cap_exodusinternational_200012.png | Exodus International (another domain). Little text (355 characters). Not viewed. | context only (check by hand) |
| 53 | https://web.archive.org/web/20030722041109/http://exodus-international.org/ | period capture | 2003-07-22 | Works. HTTP 200. | 53_cap_exodus-international_200307.png | Exodus home 2003. Tan banner, two big smiling portraits, round "e" logo, orange image-button menu, right-hand text menu, newsletter box, ad for a conference, phone number. | article; piece's look (2003 best) |
| 54 | https://web.archive.org/web/20021127005554/http://www.exodusintl.org/ | period capture | 2002-11-27 | Works. HTTP 200. Little content. | 54_cap_exodusintl_200211.png | Exodus (older domain). Little text (355 characters). Not viewed. | context only |
| 55 | https://web.archive.org/web/20030209000114/http://www.exodusnorthamerica.org/ | period capture | 2003-02-09 | Works. HTTP 200. | 55_cap_exodusna_200302.png | Exodus North America. Crimson swoosh, "Top News", "Freedom from homosexuality" in image text, footer image menu. Broken banner image; the layout repeats at the right edge (capture glitch). | piece's look (2003 image-menu) |
| 56 | https://web.archive.org/web/20030720052225/http://loveinaction.org/ | period capture | 2003-07-20 | Works. HTTP 200. | 56_cap_loveinaction_200307.png | Love in Action. Blue banner, logo, strip of 14 smiling faces across the page, small blue nav, slogan "a place for family & friends & you", ads for two events. | article; piece's look (face strip) |
| 57 | https://web.archive.org/web/20030720194858/http://www.narth.com/ | period capture | 2003-07-20 | Works. HTTP 200. | 57_cap_narth_200307.png | NARTH. Centred text, red underlined headline links, small left menu, mailing address. A line says a pamphlet was received by every school superintendent. | piece's look; article |
| 58 | https://web.archive.org/web/20030724113234/http://www.newdirection.ca/ | period capture | 2003-07-24 | Works. HTTP 200. Little content. | 58_cap_newdirection_200307.png | New Direction. Same text as the 2000 capture (728 characters). Not viewed closely. | context only |
| 59 | https://web.archive.org/web/20030719100031/http://www.pfox.org/ | period capture | 2003-07-19 | Works. HTTP 200. | 59_cap_pfox_200307.png | PFOX. White page, blue links, left column with mailing-list box, donate buttons, tell-a-friend form; line "Best Viewed With Internet Explorer"; "If you are browsing with Netscape, please download the latest version". | article; piece's look (best viewed line) |
| 60 | https://web.archive.org/web/20030620061457/http://regenerationministries.org/ | period capture | 2003-06-20 | Works. HTTP 200. | 60_cap_regeneration_200306.png | Regeneration. Waterfall photo, "There is HOPE, there is Freedom", four menu words as image text, broken button image. Page says updated 2002-11-13. | piece's look (soft nature image) |
| 61 | https://web.archive.org/web/20041028162709/http://www.evergreeninternational.org/ | period capture | 2004-10-28 (nearest found; "last modified March 2004") | Works. HTTP 200. | 61_cap_evergreen_200410.png | Evergreen. Beige page, teal table with five audience columns (Everyone, Individuals, Family, Support Groups, Therapists), religious painting, flags for languages, book list. | piece's look (audience-column table) |
| 62 | https://web.archive.org/web/20040215122517/http://www.exodus.to/ | period capture | 2004-02-15 (nearest found) | Works. HTTP 200. | 62_cap_exodusto_200402.png | Exodus 2004. Same shell as 2003 but a large group photo in the banner. News column, a tan mailing-list box with a youth photo, right text menu, phone number. | article (group photo as proof); piece's look |

Notes on the table:
- Mirror pages 15, 16, 38 and 39 come from one site. They look different from each other. 38 and 15 carry a Norwegian Google Translate bar in my capture. 16 and 39 loaded without styles. This is how the mirror rendered for me, not how the original site looked.
- Links 3 and 4: bot check (403). Link 5: plain curl HEAD said 200, but my browser got a "blocked" page. I did not try to get round this. Open them by hand.
- Links 6, 8, 9, 14 (lgbtqreligiousarchives.org) gave 503 in browser and in curl. Probably the site is down. Retry later.
- Link 11: the first curl, with a browser-style header, was rejected. Plain curl got the PDF.
- Screenshot files for failed pages (3 to 6, 8, 9, 14) show only the error page.

## 3. Ministry website captures for the 1997 and 2003 eras

How I searched: Wayback CDX API, status 200, text/html, by domain. The archive was unstable at times ("Temporarily Offline", 504). I retried until I got real answers.
Honest limits:
- "Nothing found" means my query found no 200 HTML capture. It does not prove no capture exists.
- The 1997 picture is thin. Only narth.com has a capture in 1997. Others start in 1998 to 2001.
- Not found at all (no 200 HTML capture in 1996 to 1998 or 2002 to 2004): ha-us.org, homosexuals-anonymous.org, outpostministries.org. Also none for exodus-international.org before 2003-03, for exodus.to before 2004-02, and for regenerationministries.org before 2002-08 (dates from the Wayback bar).

### 3a. Closest to 1997

| domain | timestamp | exact Wayback URL | note |
|---|---|---|---|
| narth.com | 1997-12-22 05:45:08 | https://web.archive.org/web/19971222054508/http://narth.com/ | True 1997. Screenshot 44. |
| loveinaction.org | 1998-12-12 03:06:43 | https://web.archive.org/web/19981212030643/http://www.loveinaction.org/ | Earliest found. Screenshot 45. Page is marked 1997. |
| pfox.org | 1998-11-11 18:42:46 | https://web.archive.org/web/19981111184246/http://pfox.org/ | Earliest found. Screenshot 46. |
| exodusintl.org | 1999-04-17 13:33:57 | https://web.archive.org/web/19990417133357/http://www.exodusintl.org/ | Earliest found. Screenshot 47. |
| newdirection.ca | 2000-01-15 20:29:14 | https://web.archive.org/web/20000115202914/http://www.newdirection.ca/ | Earliest found. Screenshot 48. |
| exodusnorthamerica.org | 2000-06-20 11:17:44 | https://web.archive.org/web/20000620111744/http://www.exodusnorthamerica.org/ | Earliest found. Screenshot 49 (little content). |
| evergreeninternational.org | 2001-08-01 14:24:52 | https://web.archive.org/web/20010801142452/http://www.evergreeninternational.org/ | Earliest found. Screenshot 50 (little content). |
| peoplecanchange.com (extra, not in his list) | 2000-11-09 19:37:00 | https://web.archive.org/web/20001109193700/http://www.peoplecanchange.com/ | Earliest found. Screenshot 51. |
| exodusinternational.org (extra) | 2000-12-04 18:09:00 | https://web.archive.org/web/20001204180900/http://www.exodusinternational.org/ | Screenshot 52 (little content). |

### 3b. Closest to 2003

| domain | timestamp | exact Wayback URL | note |
|---|---|---|---|
| exodus-international.org | 2003-07-22 04:11:09 | https://web.archive.org/web/20030722041109/http://exodus-international.org/ | Screenshot 53. Best 2003 Exodus page. |
| exodusintl.org | 2002-11-27 00:55:54 | https://web.archive.org/web/20021127005554/http://www.exodusintl.org/ | Nearest to 2003 for this domain. Screenshot 54 (little content). |
| exodusnorthamerica.org | 2003-02-09 00:01:14 | https://web.archive.org/web/20030209000114/http://www.exodusnorthamerica.org/ | Screenshot 55. |
| loveinaction.org | 2003-07-20 05:22:25 | https://web.archive.org/web/20030720052225/http://loveinaction.org/ | Screenshot 56. |
| narth.com | 2003-07-20 19:48:58 | https://web.archive.org/web/20030720194858/http://www.narth.com/ | Screenshot 57. |
| newdirection.ca | 2003-07-24 11:32:34 | https://web.archive.org/web/20030724113234/http://www.newdirection.ca/ | Screenshot 58. |
| pfox.org | 2003-07-19 10:00:31 | https://web.archive.org/web/20030719100031/http://www.pfox.org/ | Screenshot 59. |
| regenerationministries.org | 2003-06-20 06:14:57 | https://web.archive.org/web/20030620061457/http://regenerationministries.org/ | Screenshot 60. |
| evergreeninternational.org | 2004-10-28 16:27:09 | https://web.archive.org/web/20041028162709/http://www.evergreeninternational.org/ | Nearest found (2004). Screenshot 61. |
| exodus.to | 2004-02-15 12:25:17 | https://web.archive.org/web/20040215122517/http://www.exodus.to/ | Nearest found (2004). Screenshot 62. |

### 3c. What the pages look like (only what I saw in the screenshots)

1997 (screenshots 44, 45, 46, 47):
- Layout: one centred column on a plain or textured background. Text first, images few.
- NARTH 1997 (44): grey speckled background, coin-style logo, a clinical name. Long list with small gold-ball bullets. Two red "NEW" starburst gifs. Postal address, phone, fax and email at the foot, and "Updated 12 November 1997".
- Love in Action 1998 (45): cream parchment texture, red inverted triangle with a heart, grey small caps. A splash page with one huge blue link: "Click here to continue." Copyright line marked 1997.
- PFOX 1998 (46): white page, bold centred paragraph. Images failed to load and show as "[IMAGE]". A green LED-style hit counter sits at the bottom left.
- Exodus 1999 (47): pale yellow page, small logo, two rainbow-coloured rules, plain bullet list with a street address, phone and fax.
- No "best viewed in" line and no web-ring badge in these four.

2003 (screenshots 53, 55, 56, 57, 59, 60, 61, 62):
- Layout: fixed-width table pages, about 770 px for Exodus.
- Exodus 2003 (53): tan banner, round red "e" logo, two large smiling portraits, image-button menu with small arrows, a right-hand list menu (About, Information, Events, Resources), three boxed news items with photos, a mailing-list box, phone number at the foot.
- Exodus 2004 (62): the same shell with one big group photo in the banner. Right menu, news column, youth photo box, phone number.
- Exodus North America, Feb 2003 (55): crimson swoosh, "Top News", image-text headings, footer image menu. Broken banner image.
- Love in Action 2003 (56): blue banner, white logo text, a strip of about 14 smiling faces across the full width, small blue nav, slogan, two event ads.
- PFOX 2003 (59): "Best Viewed With Internet Explorer", a line asking Netscape users to download the latest version, mailing-list box, donate buttons, "tell a friend" form, a "Bravenet" button.
- NARTH 2003 (57): red underlined headline links on white, tiny left menu, address block.
- Regeneration 2003 (60): waterfall photo, "hope" and "freedom" slogan in image text. Page says updated 2002-11-13. One button image broken.
- Evergreen 2004 (61): beige page, teal table in five audience columns, painting of a religious figure, language flags.
- Web-ring badge: none seen on the capture pages. Ring and link-list culture is clear in link 41 (list "as of 4-23-2003", with headings for Rings, Mail Lists, Chat Rooms). Counter: seen in 46 (1998), not in the 2003 captures.

### 3d. How this could inform the piece's 1997 and 2003 screens (invented marks only)

- 1997: one centred column on a speckled grey or cream background. A small invented seal-style logo, for example "Compass" with a text name. A bullet list with small round bullets. Two "NEW" starburst sprites. A postal address block at the foot and an "Updated" line. One splash page with a single giant "Click here to continue."
- 1997 also: a hit counter with green digits (as in 46). Broken image boxes as an accident of the old web, used sparingly.
- 2003: a fixed-width table page with an image-button menu, a right-hand text menu and a big photo banner. Use invented sprite faces, not real photos. A "Best viewed in" line and a "Netscape users, download the latest version" line (as in 59).
- 2003 also: a tell-a-friend form, a mailing-list box, a donate button, a footer with a phone number. A link-list page in the style of 41 for the "ministry finder" feel. An invented ministry record page in monospace (as in 2).
- Use invented names like HopeRestored or Compass for every mark. Do not copy real logos, slogans or photos.

## 4. Visual-culture notes for the article

1. **Catalogue layout with a left category menu.** The book shop at 40 (https://web.archive.org/web/20010605015624/http://www.exodusnorthamerica.org/resources/) has a dark blue "Browse" column with 16 problem labels, for example Addiction and Parents & Spouses. Care is sold like goods in a shop. The mirror page 38 (https://www.thefrugalgamer.net/archived/ReligiousTolerance/hom_ads.htm) uses a similar blue-bar category menu to file the ads, for a different purpose.
2. **The group photo as proof.** 62 (https://web.archive.org/web/20040215122517/http://www.exodus.to/) puts one large crowd photo at the top. 53 and 56 do it with smiling portraits and a strip of faces (https://web.archive.org/web/20030722041109/http://exodus-international.org/ and https://web.archive.org/web/20030720052225/http://loveinaction.org/). Many faces stand in for evidence of success. These are real people on the original pages. Do not reproduce the photos without a rights check.
3. **The end card with a phone number.** 43 (https://web.archive.org/web/20011126031813/http://www.cwfa.org/library/family/truthinlove/mom.shtml) lists the ad shot by shot. The last row is a black end card with a slogan and a number. 42 (https://web.archive.org/web/20011204191826/http://www.cwfa.org/library/family/truthinlove/) repeats the call to action in text. The ad is built to end in a call.
4. **Persuasion as media plus script.** On 42 the page offers video as "Play" and "Download" with Real Player badges, and a "Read the script" link next to each ad. The format of the web in 2001 is part of the message.
5. **Web rings, link lists and counters.** 41 (https://web.archive.org/web/20080516071642/http://geocities.com/exgaylinks/links.html) is a hand-built link list with a colour legend, a table of contents by country and US state, and headings for rings, mail lists and chat rooms. 46 (https://web.archive.org/web/19981111184246/http://pfox.org/) has a green LED hit counter and broken images.
6. **"Best viewed in" and the tell-a-friend form.** 59 (https://web.archive.org/web/20030719100031/http://www.pfox.org/) says it is best viewed with Internet Explorer. It also has a form to send the site to a friend. The page asks the visitor to spread it.
7. **The clinical look in 1997.** 44 (https://web.archive.org/web/19971222054508/http://narth.com/) looks like a research bulletin: serif text, a long list of papers, an address. The "NEW" starbursts and gold bullets sit next to this plain, clinical tone.
8. **Rainbow rules and the soft nature image.** 47 (https://web.archive.org/web/19990417133357/http://www.exodusintl.org/) uses two rainbow-coloured rules on a plain page. 60 (https://web.archive.org/web/20030620061457/http://regenerationministries.org/) uses a waterfall and the words hope and freedom. Calm and pride colours appear as signs. This is my reading of the screenshots, not a proven design intent.
9. **Splash page, then rebrand.** 45 (https://web.archive.org/web/19981212030643/http://www.loveinaction.org/) is a splash page with one link. By 2003 the same site (56) is a bright banner with a strip of faces. A clear before and after for the 1997 and 2003 eras.

## 5. Caveats

- Mirror pages (15, 16, 38, 39) are later copies of an essay site. Page 38's footer says updated 2013. They are later research, not period artefacts. The ads they list are from 1998 and 1999.
- Capture 47 shows a "Version of 10/31/2026" line. That is a script writing today's date on the old page. Do not use it as a date.
- Capture dates are the Wayback timestamps. The page's own date can be earlier (44, 45, 41).
- Links 3 to 5 were not seen by me. Check by hand.
- Links 6, 8, 9, 14 failed with 503. Retry on another day.
- Link 35: that PDF address is dead. The server suggests other people's folders. I did not follow them. [VERIFY SOURCE] if he wants the paper.
- Link 17 date (1999) is from the list label. [VERIFY SOURCE].
- Cookie banners appeared on 19, 20 and 22. I did not click them. The article text is partly covered in those screenshots.
- Link 18: the https address fails with a certificate error. I shot the http address. Cite http or a Wayback copy.
- Links 32 and 33: the page titles do not clearly match the list labels. [VERIFY SOURCE] before citing.
- Captures 49, 50, 52, 54, 58 have little text or broken images. I did not judge them. Check by hand before use. 50 has an odd page title.
- Real people appear on many pages, and some pages list private names. I name none here. Public organisations only.
- Video posts (30, 31) were not played or downloaded. PDFs were not opened. No media files were downloaded.
- Anything proposed for the piece must use invented marks. Quotes in the article must be short and cited.
- I did not view screenshots 21, 23, 25, 26, 29 to 34, 49, 50, 52, 54 and 58 one by one. Their "what it shows" lines come from page titles, text size and the list context.
