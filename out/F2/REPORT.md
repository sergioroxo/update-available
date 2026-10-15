# F2 — 2016: less reading (W1-E1, W1-E5) — REPORT

Branch `cloud/F2` (from `origin/reinterp`). Commit `CLOUD: F2 — …`. Not merged; PR is "DO NOT MERGE (review)".

## The honest headline
**I did NOT reach "about half".** Displayed 2016 text went from **3,544 to 3,307 words (−7%)** (41 strings; no line removed). Under the rules (shorten only; never touch `_s`, dossier text; keep every fact and documented phrase; keep both voices), what is left is mostly text those rules or earlier decisions protect. To get near half would need whole lines removed or the protected text touched, which needs his yes. See "Not touched" and "Proposals".

## Files changed
`data/dialog/s3_queue.json`, `s3_comments.json`, `s3_family.json`, `s3_flagged.json`, `s3_course.json`, `s3_floppysheep.json`, `s3_maiden.json`, `s3_group.json` (strings + one `_docF2cut` note each). No code, layout, timing, colour touched. `edit.find` strings untouched (submissions untouched), so the correction list still matches.

## Words per surface (displayed text only; excludes `_` notes, `manual`/`verse`, ledger/witness lines, song lyrics)
| surface | words before | words after | change |
|---|---:|---:|---:|
| Polish (testimony list) | 482 | 478 | -4 (-1%) |
| Board / Today / sign-in | 143 | 141 | -2 (-1%) |
| Lambient (assistant lines + consent) | 233 | 212 | -21 (-9%) |
| Story editor + Your record | 90 | 87 | -3 (-3%) |
| Comments (feed + replies) | 689 | 577 | -112 (-16%) |
| Family line | 361 | 306 | -55 (-15%) |
| Flagged comments | 155 | 151 | -4 (-3%) |
| Course builder | 129 | 115 | -14 (-11%) |
| Group post | 171 | 166 | -5 (-3%) |
| Podcast | 113 | 113 | +0 (0%) |
| Tag the video | 165 | 165 | +0 (0%) |
| FloppySheep (game text) | 235 | 220 | -15 (-6%) |
| Phone: group, links, backlog | 578 | 576 | -2 (-0%) |
| TOTAL | 3544 | 3307 | -237 (-7%) |

(Method: all leaf strings per surface in data/dialog/s3_*.json, counted on `origin/reinterp` and on this branch by the same script. For reference, the earlier cut (W1-B1, S223) took the same measure from 3,689 to 3,544.)

## Not touched, and why
- **The four testimonies** (Renata, Noa, Deb, Marisol): felt, the one reading the player is asked to do; he restored Marisol's four-lines sentence in his 2026-10-09 review. Untouched.
- **`manual` / `verse` lines** (small print under each rule): the "doubling" device (`_docScripture`: same weight, shape and citation every time). VERA_OPTIONS M10 (show them once) breaks that law, so it is his call. Not edited.
- **The phone's group history and the six unread messages**: VERA_OPTIONS M8/M9 say leave (the history makes the cascade pay off; the unread ones are the era's only welcome messages, the respite register). Left.
- **FloppySheep song lyrics, the 2016 update changelog, the Getting Started card**: documented/design text or already one line each.
- **Operable text that is already at label size** (board notes, buttons, chips, group/podcast/tag-the-video lines): nothing left to shorten without losing meaning.

## W1-E5 (link-clicking cadence)
The data-side parts were already built in S227 (M1 dead fields gone, M2 second sheet shortened, M3 cascade link cards halved to five). What remains is the number of presses: unlock → notification → link → Okay → link → Okay. Merging the two sheets into one removes a press but drops the second "capture either way" chance and the `e3_malta_voted` filing: **VERA_OPTIONS question 6, his call, code change**. I did not change it, and I did not cut the cascade below the five cards he accepted.

## Proposals — NOT applied (need his yes)
- Show `manual`/`verse` in full only the first time a rule appears (M10, ~60 words).
- Testimonies: only tiny trims are possible without losing content (e.g. Noa: drop the three "that"s, 3 words); not worth touching felt text for.
- Reaching half would need cutting the comment threads' echoes to a fragment or dropping some reader comments/messages: whole-line removals, so not done.

## Every changed line (BEFORE / AFTER)
Key paths are inside the file named in each heading. 41 strings (42 places; #6 appears twice).

#### GracePlatform board / Lambient / the record — `data/dialog/s3_queue.json`

**1.** `app.doneSub` — 6 → 4 words
- BEFORE: No new stories waiting right now.
- AFTER: No new stories waiting.

**2.** `lambient.consentHello2` — 9 → 5 words
- BEFORE: I do more now, and I do it quietly.
- AFTER: I do more now. Quietly.

**3.** `lambient.consentSmallPrint` — 49 → 40 words — *every item of the small print kept; only the connecting words go*
- BEFORE: Lambient learns from this device and your account: your stories and your decisions on them, your messages, your contacts and how often you reach them, your calendar, your location history, the pages you open, and how long you spend on each. Lambient keeps working when this window is closed.
- AFTER: Lambient learns from this device and your account: your stories and decisions, your messages, contacts and how often you reach them, calendar, location history, the pages you open and for how long. It keeps working when this window is closed.

**4.** `lambient.waitLine1` — 9 → 7 words
- BEFORE: Quiet moment? The group still needs this week's story.
- AFTER: The group still needs this week's story.

**5.** `corrections[4].why` — 9 → 7 words
- BEFORE: the daily reading needs seven of these a week
- AFTER: the daily reading needs seven a week

**6.** `corrections[2].why`, `corrections[10].why` ×2 — 7 → 6 words — *appears on 2 rules (Renata's and Deb M.'s clip)*
- BEFORE: mark forty seconds for the conference audio
- AFTER: forty seconds for the conference audio

**7.** `record.footer` — 19 → 16 words
- BEFORE: This record is maintained by GracePlatform for continuity of care. Requests to amend it are reviewed by your provider.
- AFTER: Maintained by GracePlatform for continuity of care. Requests to amend it are reviewed by your provider.


#### Clear the comments — `data/dialog/s3_comments.json`

**8.** `post.text` — 34 → 24 words
- BEFORE: Three years ago I could not have written any of this down. Here is the whole thing, finally. Thank you to everyone who sat in this room with me while I got to it.
- AFTER: Three years ago I couldn't have written this down. Here it is, finally. Thank you to everyone who sat in this room with me.

**9.** `comments[0].text` — 20 → 17 words
- BEFORE: Corinne I have watched this four times since Sunday. I keep starting a comment and deleting it. Anyway. Thank you.
- AFTER: Corinne I've watched this four times. I keep starting a comment and deleting it. Anyway. Thank you.

**10.** `comments[1].text` — 21 → 17 words
- BEFORE: Is there anything like this near where I live? I do not know how you find that out without asking somebody.
- AFTER: Is there anything like this near me? I don't know how you find out without asking somebody.

**11.** `comments[2].text` — 42 → 31 words
- BEFORE: My sister did a programme like this one in 2009 and she is not okay. I am not trying to start anything on your page. I just do not think everybody comes out the other side of it the way you did.
- AFTER: My sister did a programme like this in 2009 and she is not okay. I'm not here to start anything. I just don't think everybody comes out the way you did.

**12.** `comments[3].text` — 29 → 22 words
- BEFORE: My son is sixteen. He has not told us anything but I think I know. Is there someone we could talk to first, before we say anything to him?
- AFTER: My son is sixteen. He hasn't told us anything but I think I know. Is there someone we could talk to first?

**13.** `comments[4].text` — 45 → 34 words
- BEFORE: I do not really know why I am typing this here of all places. I have not said anything out loud to anybody since about February. I am not asking for anything. I just wanted it written down somewhere that is not my own handwriting.
- AFTER: I don't know why I'm typing this here. I haven't said anything out loud to anybody since February. I'm not asking for anything. I just wanted it written down somewhere that isn't my handwriting.

**14.** `comments[8].text` — 29 → 25 words
- BEFORE: Does it come back? The wanting. I am two years in and it came back last month and I do not know what that means about the two years.
- AFTER: Does it come back? The wanting. Two years in, it came back last month, and I don't know what that says about the two years.

**15.** `comments[9].text` — 17 → 14 words
- BEFORE: my mum sent me this. I do not know what she wants me to say about it.
- AFTER: my mum sent me this. I don't know what she wants me to say.

**16.** `templates[0].line` — 13 → 11 words
- BEFORE: So glad you found us. You are not on your own in here.
- AFTER: So glad you found us. You are not alone in here.

**17.** `templates[1].line` — 17 → 14 words
- BEFORE: Wherever you are today is a fine place to start. Nobody here is going to rush you.
- AFTER: Wherever you are today is a fine place to start. Nobody will rush you.

**18.** `templates[2].line` — 20 → 18 words
- BEFORE: There is a Start Here page with the first few steps on it — the link is on our profile.
- AFTER: There is a Start Here page with the first few steps — the link is on our profile.

**19.** `templates[0].echo.text` — 40 → 24 words
- BEFORE: someone said this to me on this page a while back so i'm saying it to you — so glad you found us, you are not on your own in here. i read for a year before i typed anything.
- AFTER: someone said this to me once — so glad you found us, you are not alone in here. i read for a year first.

**20.** `templates[1].echo.text` — 30 → 21 words
- BEFORE: wherever you are today is a fine place to start, nobody here is going to rush you. i think about that line more than anything else i've read on here.
- AFTER: wherever you are today is a fine place to start, nobody will rush you. i think about that line a lot.

**21.** `templates[2].echo.text` — 28 → 18 words
- BEFORE: there is a Start Here page with the first few steps on it, the link is on their profile. that is how i started, for what it's worth.
- AFTER: there's a Start Here page with the first few steps, link on their profile. that's how i started.

**22.** `templates[3].echo.text` — 31 → 24 words
- BEFORE: if you ever want to write yours down, we would love to read it. that is what somebody said to me and it is the only reason i sent mine in.
- AFTER: if you ever want to write yours down, we would love to read it. somebody said that to me. it's why i sent mine.

**23.** `templates[4].echo.text` — 20 → 17 words
- BEFORE: we keep this space kind. thank you for reading with us. (borrowing that from the page, it does the job)
- AFTER: we keep this space kind. thank you for reading with us. (borrowing that, it does the job)

**24.** `templates[5].echo.text` — 27 → 20 words
- BEFORE: nobody should have to work this out on paper, they will find somebody near you. mine actually turned up at the door, which i did not expect.
- AFTER: nobody should have to work this out on paper, they'll find somebody near you. mine turned up at the door.


#### Family line — `data/dialog/s3_family.json`

**25.** `parents[0].body` — 69 → 51 words — *Ruth — a mother's message; shortened, every fact kept (Easter, the card, gone away, keep writing?)*
- BEFORE: She hasn't answered since Easter. I sent a card for her birthday and it came back marked gone away, so either she moved or she told them to send it back, and I don't know which one I'd rather. I'm not asking you to make her call me. I'd just like to know if I should keep writing or if the writing is the thing that's keeping her away.
- AFTER: She hasn't answered since Easter. Her birthday card came back marked gone away, so either she moved or she had it sent back, and I don't know which I'd rather. I'm not asking you to make her call me. Should I keep writing, or is the writing what keeps her away?

**26.** `parents[1].body` — 84 → 63 words — *Maureen — the booklet's rules and 'five months' kept*
- BEFORE: We did the house rules the way the booklet sets them out. No sharing a room, no bringing her to the table as a couple, and we said it kindly. She hasn't been back since March. My husband says we did the right thing and I think he's right. I keep turning it over at night anyway, because it seems to me the right thing shouldn't be a thing you can do to your own daughter and then not see her for five months.
- AFTER: We did the house rules the way the booklet sets them out: no sharing a room, no bringing her to the table as a couple, said kindly. She hasn't been back since March. My husband says we did the right thing and I think he's right. I still turn it over at night: the right thing shouldn't mean five months without your daughter.

**27.** `parents[2].body` — 58 → 48 words — *Annette — the form, 2014, 'and it is yours' kept*
- BEFORE: I'm not asking for advice this time. I'm asking whether you know where she is. She put your address on a form in 2014 — I have the copy, she left it at ours. That is the most recent address I have for my daughter and it is yours. Please just tell me if she still comes there.
- AFTER: I'm not asking for advice this time. Do you know where she is? She put your address on a form in 2014 — she left the copy at ours. It's the latest I have for my daughter, and it's yours. Please tell me if she still comes there.

**28.** `replies[0].preview` — 19 → 17 words
- BEFORE: Eight weeks, with other parents. Grief is the right word for this and you are allowed to use it.
- AFTER: Eight weeks with other parents. Grief is the right word, and you are allowed to use it.

**29.** `replies[1].preview` — 20 → 18 words
- BEFORE: Keep the door open and keep it quiet. This is a long journey and it is not yours to hurry.
- AFTER: Keep the door open and keep it quiet. It is a long road and not yours to hurry.

**30.** `replies[2].preview` — 23 → 21 words
- BEFORE: Grace and truth are not opposites. You can love her completely and still keep your home the way you believe it should be.
- AFTER: Grace and truth are not opposites. You can love her completely and keep your home as you believe it should be.

**31.** `lambient.onQuiet` — 15 → 9 words
- BEFORE: That one's outside what we send. Mark it handled and it comes off your list.
- AFTER: That one's outside what we send. Mark it handled.


#### Flagged comments — `data/dialog/s3_flagged.json`

**32.** `thread[3].body` — 28 → 24 words
- BEFORE: If you ever want a coffee with somebody who is not going to ask you a single question about any of it, I am in Cork most weeks.
- AFTER: If you ever want a coffee with somebody who won't ask you a single question about any of it, I'm in Cork most weeks.


#### Course builder — `data/dialog/s3_course.json`

**33.** `modules[0].desc` — 16 → 10 words
- BEFORE: Why an intense friendship can feel like more than friendship, and how to tell the difference.
- AFTER: Why an intense friendship can feel like more than friendship.

**34.** `modules[1].desc` — 11 → 8 words
- BEFORE: The family-of-origin hurts a mentor will want to hear about first.
- AFTER: The family-of-origin hurts a mentor hears about first.

**35.** `modules[3].desc` — 11 → 8 words
- BEFORE: Reconnecting with the parts of yourself the relationship had crowded out.
- AFTER: Reconnecting with what the relationship had crowded out.

**36.** `modules[4].desc` — 12 → 10 words
- BEFORE: Closing the course with where wholeness in Christ is meant to lead.
- AFTER: Closing with where wholeness in Christ is meant to lead.


#### FloppySheep (Lamby) — `data/dialog/s3_floppysheep.json`

**37.** `intro.voice` — 37 → 30 words — *the closing line is also push[3] and droneSays[2] in play — said once there, not three times*
- BEFORE: Hello, shepherd! The meadow is full of little lambs who haven't heard the good news yet. Call every one you meet, and keep them close until the song is over. Don't let a single one slip away!
- AFTER: Hello, shepherd! The meadow is full of little lambs who haven't heard the good news yet. Call every one you meet and keep them close until the song is over.

**38.** `intro.how` — 26 → 18 words — *'tap again in the air' is also the in-play hint (hint.air)*
- BEFORE: Tap or click to hop (tap again in the air to keep rising). Touch a lamb to call it. Call them in a row for OUTREACH!
- AFTER: Tap or click to hop. Touch a lamb to call it. Call them in a row for OUTREACH!


#### Phone — `data/dialog/s3_maiden.json`

**39.** `block.ignoredBody` — 21 → 19 words
- BEFORE: Something was shared in one of your groups that is outside what we allow. You do not need to do anything.
- AFTER: Something shared in one of your groups is outside what we allow. You do not need to do anything.


#### Group post — `data/dialog/s3_group.json`

**40.** `feed[0].text` — 10 → 9 words
- BEFORE: Day 40. Thank you all for the prayers this week.
- AFTER: Day 40. Thank you for the prayers this week.

**41.** `group.meta` — 9 → 5 words — *'admin approval required' is also the About line, one tap away — said once*
- BEFORE: Private group · 4,208 members · admin approval required
- AFTER: Private group · 4,208 members


## Checks
- `npx tsc --noEmit`: clean. `npm test`: passes (invariants, rooms, spec, licences).
- **Walk:** the requested full walk (`node tools/walk.mjs --port 3000 --max 2600 --require-close`) was started but **not completed on this machine**: software-rendered Chromium reached only step 330 (Era 1) in about an hour, so a full run would take ~6 h. Partial log: `out/F2/full_walk_partial.log` (last line: `332 press start-menu e1 desktop`). It stalled for slowness, not for any error. Instead I ran Era 3 alone, the era every edit is in: `node tools/walk.mjs --port 3000 --from-era 3 --one-era --max 2600` → **walked e3 to e4, 144 presses over 174 steps, console clean** (`out/F2/walk_era3.md`). That is not a reachability proof (starts with `era=3`); **the lead's machine should re-walk the full path before merging.**

## Could not verify
- No screenshots (before/after of the busiest 2016 screens): I did not find a reliable way to drive the 2016 screens to a still on this machine in the time; the strings only got shorter, so no wrap/overflow risk is expected, but I have not looked at them.
- Headset: nothing XR-touching changed.
- Voice: all felt-line edits (comments, parents' messages) are for his eye first; his edit wins.
