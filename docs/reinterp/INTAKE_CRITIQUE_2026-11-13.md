STATUS: live

# The 1997 intake corner: critique and three ways forward

*13 Nov 2026. A read-only review of build ca002879.*

## 1. Why it does not read

1. **Nobody is taken there.** The guided walk of 10 Nov presses 71 times in 1997. Every press is on the monitor, and the walk never turns round. Three things invite a turn:
   - a 7-second toast that says "Record filed." but not where;
   - a blue tint at the screen's edges;
   - a line that says "Turn around."

   The flip is optional, and Rob carries on anyway. Most visitors see the corner once, late, or never. That breaks your rule of 10 Oct.

2. **Its story happens offstage.** Since S183c, the corner changes only while your back is turned. So 1997's strongest beats happen unseen: your mother is called, the bag is packed, and consent is signed before you are asked. A visitor who turns once sees a finished tableau, not a sequence.

3. **It is an office in a teenager's bedroom, and nothing says why.** The old witness side was a dark, separate space. Now his bedside lamp lights it too, and the grey floor is too quiet a sign. Visitors take the cabinet for furniture.

4. **Six things speak at once, in four voices.**
   - The six: the wall, the terminal, the drawer, the index card, the referral list and the suitcase.
   - The four voices: a cold form, a plan in tiny type, a plain name when you look, and a dossier line when you press.
   - Four of them carry the number 12: CASE 12, drawer 12, DEPART 12 JUL and the tag's 12–19. A newcomer cannot tell an ID from a date.

5. **The drawer promises and does not deliver.** Looking at it shows "the file with your name in it". Pressing it slides out a solid box for 2 seconds. There is no inside. The caption then talks about the questionnaire. Your headset note was: "it just opens." This is the core failure.

6. **The wall tells you to stop.** "READ ONLY — DOES NOT RESPOND" and "Not shown to the subject" tell a newcomer there is nothing here for them. Its best row is cut off with "…": your own answers, re-captioned as "activity: after hours" and so on.

**What its job should be.** The desk shows what is said *to* Daniel. The corner should show what adults do *about* him, behind his back, which here is literal. It has one fact to land: **the decision was made before he was asked.** The packet says "[ already signed ]". The corner should show who signed it, and how. Then it hands the file on to 2003.

## 2. Three options

### Option A: Open the file (the smallest change that reads)

**When:** after the packet's Sign, before the diary.

1. The visitor presses Sign. The stamp sounds.
2. The piece turns them round, with the existing ⟲ turn (a blink in the headset). They face the cabinet.
3. Drawer 12 slides fully out. A buff folder rises to the eye, as the handheld and the Wick card do. It lies open.
4. **Page 1, Intake summary.** On the left, what they picked in the profile ("I keep a diary"). On the right, what it was filed as ("self-monitoring: enabled"). These lines already exist (`opening.json` `recaptions`).
5. A press opens **page 2, Contact log**, the mentor's typed notes: first contact; private messages; "Telephoned mother. 20 min. Relieved. Pastor referral."; placement prepared.
6. A press opens **page 3, Consent**. The parent's line is signed in his mother's biro, the calendar's hand, and dated days earlier. His own acknowledgement is stamped today. A packing list is clipped on: two weeks of clothes.
7. One more press puts it back. The drawer slams, and they are turned back to the desk.

After that, a press on the drawer brings the folder back. The "Turn around" hint becomes a "Take me there" offer, as 2026 already does for the headset.

- **The background story:** the adults' week, in their own cold paperwork. His mother is a phone call and a signature. She never speaks.
- **Cost:**
  - a folder: 2 draw calls (the 1997 back view uses 28–31 of 75);
  - three pixel-type pages, about 120 new words;
  - one turn, using existing code;
  - about 30–40 s more in 1997.
- **Risks:**
  1. A forced turn in the headset. Use the blink, never a slow spin.
  2. Her signature is close to a real hand. Keep it to a signature and a date. This is your ethics call.
  3. The Family Form already confuses ("family form… what is that?"). Page 1 can say "Family Form: received."

### Option B: Watch it being arranged (no new object)

Keep the corner, but stage two of its changes in front of the visitor.

1. **At the hook (Rob's picture),** a conducted turn replaces "Record filed.". The wall wakes and types Daniel's name. The stamp lands, and drawer 12 slams. The card does not fly, because you cut that on 27 Sep. Then they turn back.
2. **At "i spoke with your mother",** they turn again. The terminal types PARENT REACHED / PASTOR REFERRAL. Her referral list goes up, and the suitcase appears.
3. **After the packet,** you only hear the suitcase moved to the door.

- **The background story:** told by objects arriving, not by reading.
- **Cost:** choreography only, almost no text, about 20 s more.
- **Risks:** it breaks into the DM, already too slow for you, twice. The plan stays in tiny type, and there is no opened file.

### Option C: The file that travels (Option A, through the whole piece)

1. **The update to 2003:** in the flight, the folder goes into the cabinet's scanner.
2. **2003:** the existing "Your file (read only)" opens on a grey scan of page 1, followed by the New Morning conduct record.
3. **2016 and 2026:** *Your record* and the *Legacy file* show the scan as a thumbnail. No new screens.
4. **The Close:** the folder lies on the desk behind you, by the receipt. Each page now carries its dossier practice and status in the menu's plain voice. The drawer's practice caption moves here.

- **Cost:** A, plus a scan look, two thumbnails and a folder at the Close (about 3 draw calls).
- **Risks:**
  1. It is two jobs, not one.
  2. A file that travels for thirty years is the piece's device, not history. It needs S182's `speculative` source line, which still waits for your approval.

## 3. Recommendation

1. **Build Option A now.** It is your wish, it takes the visitor there, and it is cheap.
2. **Draw its pages so that C can reuse them.** Decide on C after A in the headset.
3. **Add B's first turn only if** testers still miss the wall.

**What to cut:**

1. **The drawer's practice caption.** Move it to the Close or drop it.
2. **The drawer's creep of 1.4 cm per filing.** Nobody sees it. Keep the slam.
3. **"Record filed." as the only call to turn.**
4. **The 1997 terminal.** Page 2 tells the same plan, which you ruled against on 27 Sep ("two surfaces saying one thing"). It can arrive in 2003 with the scanner. This is your call.
5. **The clash of 12s.** Keep 12 July. Give the case and drawer another number.

**What I need from you:** which option, your ruling on the signature, and a drawer number.

---

*Evidence:*
- Photos: `scratchpad/decide/01-drawer*.jpg`; `update-available-uib/out/s375/browser/stills/e1-04*`, `tour-e1/28-flip-wall.png`, `sweep/e1-room-back.png`.
- Code: `src/room/institution.ts` (out-of-view arrivals, l. 255–272; the drawer, l. 274–278); `src/desktop/os.ts` (the toast, l. 2602; the 8 s fallback, l. 198).
- Strings: `slice.json` (the record and `behindToast`), `aim.json:40`, `institution.json`, `opening.json` `recaptions`, `map.json` `wall`.
- Dialogue: `s1_end.json` (the packet).
- Walk: `WALK_2026-11-10_SPEEDRUN_GUIDED.md`.
- His words: `HEADSET_SESSION_2026-10-31b.md`, `PLAN_ROUND5_2026-09-27.md` (S182–S183).
