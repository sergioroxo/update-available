STATUS: live

# Brief 8, rewritten (7 Nov 2026): Vera's phone, mirrored beside the platform

*Supersedes `CODEX_BRIEF8_READY_2026-11-07.md` and §8 of `CODEX_BRIEFS_BUILD_E3_E4_2026-11-03.md` (the
sign-in notice). Paste everything below the line into a NEW Codex chat.*

**Why it changed (Sérgio, 7 Nov):**
1. Players don't look at a phone on a stand. His idea: **mirror the phone on the computer**, as people did in 2016
   with official phone-mirroring software (for example Samsung's, which put a live phone window on a Windows
   desktop over USB or Wi-Fi: PCWorld, https://www.pcworld.com/article/438862/samsung-brings-sidesync-phone-connectivity-to-all-pcs.html
   and Samsung Newsroom, https://news.samsung.com/global/samsungs-sidesync-bringing-your-mobile-and-pc-closer-together-than-ever
   `[VERIFY SOURCE]` until opened). Her life then sits **beside the work, on the screen the player is already using.**
2. In his latest test **Lambient was not really functional.**
3. The **"Your record" chip is too in-your-face**: the information is interesting but should not be pushed at the player.
4. **The lesbian-specific hurdles of SOGICE must be present.** Right now they show only in other women's stories.
5. **The platform stays open with the phone next to it**, so the updates (Malta, the cascade) arrive the way news
   really arrived, on her phone, while she works. The story should not feel staged.

---

Repository: sergioroxo/update-available, branch `reinterp`.
**Work in your own folder:** `cd /Users/sergiogalvaoroxo/update-available-reinterp && git fetch origin && git worktree add -b codex/e3-phone-mirror ../codex-e3-mirror origin/reinterp`,
then work only in /Users/sergiogalvaoroxo/codex-e3-mirror (symlink node_modules from the main folder). NEVER run
`git checkout` in /Users/sergiogalvaoroxo/update-available-reinterp. Push your branch at the end, not `reinterp`.

Read CLAUDE.md and docs/ETHICS_CONSTRAINTS.md first. Their laws bind you:
- no runtime network calls and no storage;
- colours only from `src/desktop/theme/*`;
- click/tap only: **no free text, no reply box, no send**;
- no timers that punish, no scores;
- invented marks only, and no real people;
- every docs/**.md starts with `STATUS:`;
- commit with explicit paths, never `git add -A`, never stage README.md;
- one line in BUILD_LOG.md per session (next number after the last).

**GUARD 1:** nothing may read as one person's identity trajectory. Nothing from Vera's phone survives into 2026.
**GUARD 2:** her own things are ordinary private objects and acts, never identity signals, and nobody declares
acceptance of her to make a scene work.

**E3 has no respite (Sérgio, confirmed).** Everything on her phone is `felt`. Lambient, the guide, its glow and
the Start map never point at, comment on, or draw over the mirror. **The platform never reads the phone.** It sits
beside her life, not inside it. The pressure on her phone comes from people (a mentor, a group, her mother), which
is the piece's point about weaponised care.

The copy below is final (Claude wrote it; Sérgio may still edit). Use it exactly and mark nothing PENDING. Lines
marked ⚑ETHICS are his to confirm after he sees them built; build them anyway.

---

## Step 0 · Lambient works (bug fix, first commit)

His test: Lambient "wasn't really functional". Walk 2016 first (`node tools/walk.mjs --port 3114 --jump e3`, then
once from the entrance) and **log every Lambient line and every guide balloon with its time and the screen it was
on**, in the report. Leads found by reading the code, not by playing it (confirm each one or rule it out):

- `data/strings/lambyGuide.json` `eras.e3.phone.target` is `[]`, so the guide's "take me there" has nothing to
  point at during the phone step.
- `src/room/graceQueueLite.ts` ~1642 draws Lambient's lane only when `lambPriority || !lambyGuide.active`, and
  `lambSay` waits on the guide (`guideWait.run`, ~986). The two Lambients (the lane and the guide balloon) may be
  silencing each other, so neither seems to speak.
- `eras.e3.cascade.target` names phone rects (`group`, `inbox`, `notification`). Check they are published when the
  phone is on its stand, not only when it is held.
- The S317 merge replaced our e3 guide steps with the trial's. Check every `target` id against the rects the
  platform actually publishes at that step (`pipeline`, `vera-install`, `vera-kit`, `vote`).

**Done when:** at every required step the guide can offer "take me there" to a live control. Lambient's own lines
(greet, consent reply, the day's order, first task, phone, the two "after" lines) are each seen once. Two Lambient
voices never stand on screen at once, and neither one waits forever. Keep the laws: ≤5 unsolicited balloons per
era, never on a `felt` screen, dismissal works and is logged.

## Step 1 · The mirror (core commit)

**The idea.** When the platform opens, her phone is already connected to the computer and its mirroring app opens
by itself, as such apps did on connecting. The workstation shows **two windows side by side**: GracePlatform on the
left and **PocketPane** (invented name; check it isn't a real product before shipping) on the right, showing her
phone's screen. The physical phone on its stand left of the monitor shows **the same screen at the same moment**.

- **Layout.** GracePlatform is no longer maximised. It takes the left ~two-thirds; PocketPane is a portrait phone
  window at the right. Both have ordinary window chrome. PocketPane's chrome is plain and neutral (era-3 greys,
  never the Grace accent and no Lamb mark), so it reads as **a different program from a different company**.
  Re-measure every platform screen for legibility at the new width, **from the seat in the headset numbers**
  (`tools/stills.mjs` + the FOV audit). If a platform screen can't fit, PocketPane narrows. The platform never
  covers it.
- **Enlarge.** One press on PocketPane's title bar swaps it to a large view over the platform; a second press
  returns. Add a **minimise** box. In the taskbar it becomes "PocketPane · {unread}" and one press restores it.
  **No close box.** It closes only when the phone disconnects (Step 4).
- **One phone, two screens.** PocketPane draws the phone's own screen, using `PhoneE3`'s painter on the one shared
  phone object, not a copy. Read state, open thread and scroll are the same on both. Picking the phone up still
  works. While it's held, PocketPane keeps mirroring.
- **Read-only.** A thread opens with one press, and Back returns. Where the reply box would be, the mirror shows a
  greyed line: **"Reply on your phone"**. She never does. No send, no chips, no typing.
- **Banners carry the story.** Every new message arrives as a banner at the top of the mirrored screen, showing
  **the whole message**. Every message below is short, so nobody has to open anything to get the story (the 10 Oct
  rule). The banner stays until the next new message, and the phone in the room lights at the same moment. No
  sound except the phone's existing short buzz, if one is registered. Lambient never mentions a banner.
- **Story time, not a clock.** The phone's clock moves forward with the work, never with real seconds. Each
  arrival below is keyed to a beat the player has already reached. Nothing expires and nothing is missed for being
  slow.
- **Retire:** the 3 Nov plan's sign-in notice card and its `personal-message` map row. Remove the `e3_backlog`
  filing from the inbox press, keep read state in `readMessages`, and list every consumer in the report
  (`src/witness/record.ts:133`, `recordCount()`).

## Step 2 · The evening (one commit): her life, and the hurdles a lesbian meets

The day is the built date, **Tuesday 6 December 2016**. Everyone wants her Tuesday.

| Phone clock | Arrives when (beat) | From | Banner text (exact) |
|---|---|---|---|
| 18:04 | platform opens (arrival ends) | **Orla** | "quiz at the wick tonight. dee's keeping the corner table. no pressure x" |
| 18:31 | first job opened | **Maiden-to-be** (the existing group) | "Tuesday check-in: one place you were tempted this week, and one place you walked away. Reply in the thread." ⚑ETHICS |
| 19:40 | first Apply/Skip decision made | **Mam** | "Pastor's wife was asking for you. Their women's group meets Tuesdays, just tea. No pressure love x" |
| 20:12 | the first Send completes | **Mentor** (the contact is saved under the role, no name) | "I know Tuesday is that bar. You don't owe anyone an explanation for staying home x" ⚑ETHICS |
| — | Story Record open (her own 2014 story) | nothing arrives | silence on both screens |
| 21:30 | Story Record closed | **Mentor** | "You and Orla text a lot. Remember the signs we talked about. Not a rule. Just love." ⚑ETHICS |
| as built | the vote, the cascade | **Bea** and the forwards (existing copy) | unchanged, now arriving in the mirror while the kit sits on the platform |
| 22:51 | after the cascade, before the update | **Orla** | "missed you tonight x", with a photo: the corner table, two glasses, one empty chair, no people |

**What each row is doing (and its source):**
- **Orla's two messages** frame the loss. The second is the loss itself: one evening with her friends, which the
  work took. Nothing explains it. (The Wick is invented. Do not use Dee's carol night, which is on the 20th.)
- **The Maiden-to-be check-in** is documented practice: moderated, application-only women's forums where members
  confess "lapses" to each other as accountability. Sources: the *Outlove* excerpt, Daily Beast, 27 Jun 2021; the
  Living Hope forums page (both opened, in `RESEARCH_2016_VERA_APPARATUS_2026-11-01.md` §4 rows 3, 5). The group is
  invented.
- **The mentor and the bar.** A ministry advised a woman to avoid lesbian venues. That is documented in a 2018
  undercover report (SMH via ABBI, row 4). It is placed in 2016 as consistent with the record, and this instance
  is invented. This is the hurdle no gay man's era shows: **the bar, the community's one room, is named as the
  danger.** The bar itself is never touched or revealed as anything. The pressure is on her going.
- **The mentor and Orla.** Close friendship between women is framed as "emotional dependency", with warning signs
  such as constant contact. Documented: Harvest USA, 30 Mar 2016; Robinson and Spivey 2015 (rows 8, 9). For a
  lesbian, **a friend's texts become evidence.** Orla is never told and never changes. "Just love" is weaponised
  care in two words.
- **Mam and "no pressure".** Mam and Orla use the same words. Both mean it. The piece never says which one wins.
- **Malta in the mirror.** The news reaches her the way it reached people, on the phone, while the campaign kit
  sits on the platform beside it. Don't add a new popup for it. Move the existing arrivals into the mirror.

The existing threads (Nuala, The Wick lot, Dee, Bea, the coupon) stay in the phone's list as built.
**The Wick lot** is shown **muted, 87 unread**, and SisterSignal team **3 unread**. These are static authored
numbers, not counters.

## Step 3 · Her notes and her camera roll (one commit)

- **The conducted beat (once).** When the player finishes the first testimony correction (other women's sentences
  made neat), the mirrored phone **goes to Notes by itself**, as if she picked it up. It opens her draft to Mam and
  the cursor blinks after the last word for about three seconds. Then it returns to the home screen. Nothing is
  pressed, nothing is filed, no Lambient. This is the era's contrast: **the platform finishes everyone's story; hers
  stops at "It's".**
  - Notes, newest first: **"Mam — I won't make Sunday. It isn't you. It's"** · **"shop: oat milk · bin bags · card for dee"**.
    (Drop the car park note.)
- **Camera roll** (under the Photos tile; read-only grid plus a viewer, one press each):
  - three near-duplicate photos of a slice of birthday cake on a saucer, one of them blurred;
  - one screenshot: **"46A · last bus 22:40"**;
  - Orla's 22:51 photo, once it has arrived.

  Draw them **procedurally on the phone canvas** in the era palette, the way `folder1997.ts` draws frame 27 with
  polygons, so they add 0 bytes and 0 draw calls. No faces, no people, no captions that explain.

## Step 4 · The update takes it (one commit)

When Era 3's update installs, PocketPane shows one line in its own plain chrome: **"This device is no longer
supported. Phone disconnected."** It closes. The phone in the room goes dark and stays dark. In the u4 changelog in
`data/strings/updates.json`, add **"- phone link: not supported"** to the E3→E4 list. Nothing from the phone
reaches 2026 (guard 1). This is the specific loss: the window the player sat beside all era.

## Step 5 · "Your record" goes quiet (one commit)

On 2016's platform the taskbar chip **"Your record · {n}"** (`s3_queue.json` `recordChip`, rect `record-chip`)
counts live and lights up each time the file grows. Sérgio: too in-your-face.
- Remove the chip from the taskbar in 2016 and remove its light-up pulse.
- Keep the surface and its content. Reach it from the platform's **Start menu**, as a plain row
  **"My account · activity"**, which opens the same page.
- Map row `record` (`data/strings/map.json` ~397): hint **"Your record is in the Start menu, under My account."**
  It stays optional.
- The game menu's "Your file" and the other eras' records do not change.

## Step 6 · Optional, cut-able (one commit): Lambient offers to hold her phone

Once, the first time a banner arrives while the board is showing, Lambient says (its lane, one beat, two lines):
**"Your phone is connected. Focus mode can hold notifications while you work."**, with **[Turn on]** and **[Not
now]**. Either answer changes nothing: messages keep arriving in the mirror. Lambient knows only that a phone is
plugged in, never what is on it. ⚑ETHICS: Sérgio decides whether this stays. It is the system offering, kindly, to
close her life off, and failing like everything else.

---

**Acceptance checks, by feel:**
- From the seat, both windows can be read without leaning, and the phone on the stand lights with each banner.
- A player who never presses anything on the phone still reads Orla, the check-in, Mam, the mentor twice, Malta and
  "missed you tonight". They also see the Mam draft once.
- Nothing on the phone can be answered, and nothing on it is ever filed.
- Lambient speaks, the guide can take you to each required control, and neither one ever touches the mirror.
- "Your record" is no longer in the taskbar. It's in the Start menu.
- At the update, the phone disconnects and stays dark. 2026 has no trace of it.
- `?flat=1` still works.

**Verify:**
- `npx tsc --noEmit -p .` and `npm test` pass.
- Photograph every step with `tools/stills.mjs` into `out/codex-e3-mirror/`.
- Measure draw calls at the seat and at the E3→E4 transition (target +0).
- `node tools/walk.mjs --port 3114 --max 2600 --require-close` must reach the Close, plus the speedrun cut.
- A focused regression covering: minimise and restore, enlarge, pick up the phone with a banner showing, menu
  pause, restart, the `settleArrival` jump, Malta, both kit answers, take-down, the update, exit.

**Report:** `docs/reinterp/CODEX_E3_PHONE_MIRROR_REPORT_2026-11-07.md` (STATUS: live), with:
- each commit hash;
- the Lambient log from Step 0;
- the legibility numbers;
- what needs a real Quest (reading two windows from the seat; whether PocketPane reads as her phone rather than
  the platform watching it; the lit phone).

Reply with the branch, the commits, whether the walk reached the Close, and an 8-line plain summary (short
sentences; the lead is dyslexic).
