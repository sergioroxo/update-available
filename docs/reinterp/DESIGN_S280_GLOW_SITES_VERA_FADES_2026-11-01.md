STATUS: live

# Four answers of 1 Nov, turned into designs (S280)

His answers are in TRIAGE_HEADSET_B_2026-11-01.md ("His answers, 1 Nov"). This note says what each becomes. Nothing
here waits on him unless it says **HIS**.

## 1. One glow logic for the whole piece ("where we need to go")

His words: "FloppySheep and the message app should slightly glow differently so we can understand where we need to
go, that is a logic that should be around the whole experience."

**Two glows, everywhere, and only two:**

| Glow | Means | Look | Where it comes from |
|---|---|---|---|
| **The path** | the next thing the story needs | a soft ring that breathes slowly (about 2.4 s), in the era's warm accent, 2 px | the map's current beat → that beat's targets in `data/strings/lambyGuide.json` (`eras.eN.steps.<beat>.target`) — the same ids Lamby's "Show me" points at, so the glow and Lamby never disagree |
| **You may** | something optional, there for you | a fainter, cooler shimmer, slower, never a ring | the map's `optional` beats, plus the free things (FloppySheep, the "1997" folder, the games) |

Rules:
- One path glow at a time. It waits a few seconds after the screen settles, so it never flashes during a change.
- Never on a felt or respite surface (Caleb, the folder's pictures, the Commons): those are found, not pointed at.
- In the room (3D), the same two meanings use the existing "breath" on props (the lift), path = warm, may = cool.
- The 2016 phone gets its targets filled in (the `phone` beat had none: that is why the messages were lost).

Build order: the 1997/2003 desktop (os.ts icons) and the 2016 phone first (his example), then 2016's workstation and
2026's browser.

## 2. The "About this" panels become websites of the time (one per era)

His words: "all the 'about this' panels … in the menu with the rest of the sources, and … at the close … make them
into webpages of the time, and the multiple tabs can contain all the information … this would be great for the
website of the project later … it includes all the ideas, the texts, the information, the sources, images all of it
that we wanted to add but got lost … like having the video there to play."

**What it becomes:** four period websites, one per era, each a small browser of its own year:
- 1997 — a GeoCities-style page (frames, a counter, a web-ring bar), 2003 — a portal with tabs, 2016 — a responsive
  blog/platform, 2026 — an app-like site.
- **Tabs on each:** *The story* (what happened in this era, plainly) · *The practices* (every "About this" text,
  moved here from the experience: the Family Form / anamnestic questionnaire, Release Work and the pillow, the
  pledge, the accountability software, the testimony economy, the detransition agents) · *Sources* (the existing
  verified sources pages, verbatim links only) · *Images* (period references, the article picks) · *Media* (the
  1997 tape, the Truth in Love spots description, the 2016 video, the 2026 stream — playable where licensed) ·
  *Missed it?* (the beats a visitor may have skipped, replayable as text).
- **Where they open:** the menu's Sources (any time), and the Close's panels (each era's panel opens its site).
- **The experience loses its "About this" panels** (he: "not for here — for the Lexicon/close").
- Later: the same sites are the project website's era pages (static, no network, no storage).

Content gathering: every "About this" string in `data/provotypes/*.json` and `data/strings/*` (`about`, `aboutThis`),
the dossier cards, SOURCES_*.md, REFERENCE_LINKS_CHECKED_2026-10-31.md, the ad-campaign file, the folder pictures.
Also added to the article companion (ARTICLE_COMPANION, §"From panels to period websites").

## 3. 2016: Vera has no story (HIS ruling acted on)

His words: "Why is the contributor tools relevant in terms of narrative here? Like Vera has no story, no emotional
connecting points, it just erasure of the Lesbian — not good."

**Proposal:** the update that ends 2016 stops being "contributor tools" and becomes Vera's own record being turned on
her — built from the stories he already approved (STORIES_VERA_MAYA §8):
1. **Nuala (V1):** the thread on her phone; the missed call on her birthday; the key on red thread (no clothing).
2. **Her own first testimony (V2, "really good if well done"):** in her record, "Stories on this account · 1 · 2014 ·
   published" — "as sent" against "as published". The first correction she ever applied was to herself.
3. **The Wick (V3):** Dee, the stamp card on her desk (objects allowed) — respite, never targeted.
4. **The update** then asks her to tag and "restore" her own 2014 story for the platform — the same tool she used
   on other women, now on herself. Malta (the vote) is what breaks it: the system's last ask comes after Malta and she
   does not finish it. The contributor-tools changelog line goes.
This needs a 2016 restructure note before building (next after the Era 4 research lands).

## 4. The transitions: no circle grid, smoother, particle-based

His words: "not the ones … with the circular pattern, it is ugly and bothersome visually. It needs to not be
roughcut, smoother, more particle based. stuff morphs into."

**What changes:** the pixel-circle dissolve (`xr-pixel-dissolve`, src/frame/xrComfort.ts, and the jump's veil) becomes
a soft particle drift: the old room breaks into a few hundred small warm squares that drift and thin out while the
new room's squares gather and settle (1.5–2.5 s), no hard grid, no circles, no black frame. Same comfort law (no
camera motion in VR; the veil only). The Close's fades get the same particles instead of flat fades.

(The "lamp" in the Close was the report's word, not his — dropped.)
