STATUS: live

# 2016 visual review, before the second design pass

3 November 2026. Requested by Sérgio during the full walk. The walk was stopped in 2003 at his request to redesign before running the gate. Implementation baseline: `1fbde19d`, branch `codex/vera-2016`. No push. The findings below record the baseline. The approved redesign and its fresh evidence are recorded at the end.

## Story judgement

The sequence makes sense: Vera edits another woman, sends her words into distribution, then sees that the same process has already been applied to her. The phone restores the woman and place removed from the official account. The campaign reuses that account, the take-down exposes persistence, and the group outnumbers the block.

The screens need to distinguish three activities more clearly: editing media, reading a personal record, and distributing an institutional asset. Currently they share large text panels with similar visual weight. The system explains too much of its operation in paragraphs; the player should also see the operation happen.

## Fresh evidence

Chrome, headless, 1440 × 1000. Captured in this review through the surfaces’ published hits, with no debug beat or ledger writes. Start route: `/?reinterp=1&kiosk=0&era=3&debug=1&descent=0&home=0`. The room screenshots preserve the actual 3D view; the companion PNGs are unaltered copies of the actual canvas texture. They are not flat-mode screenshots or mockups.

| Step | Screen and health | Finding and next design move |
| --- | --- | --- |
| 1 | Renata; understandable, visually dense | The tracked cuts work. The correction panel has more typographic weight than her account. Keep the words whole, reduce repeated platform explanation, separate the current sentence from the house rule. Evidence: `out/design-e3-before/01-renata.png`. |
| 2 | Noa’s attached video; weak visual readability | The tightly cropped, low-resolution hands can read as two faces or abstract shapes. The player and Play button feel separate. Recompose the actual clip and give the player one coherent frame. Evidence: `02-noa-video.png` and `02-noa-video-room.png`. |
| 3 | Video playing; action weakly communicated | The playback line and waveform offer little connection to the words being corrected. An authored strip of frames and a selected sentence could make the edit legible without free dragging or extra controls. Evidence: `03-noa-playing.png`. |
| 4 | House grade applied; change visible, consequences hard to read | The original thumbnail is useful but much smaller than the edited image. Her transcript is clipped after “which I know is a small thing…”; the ending is lost. The grade, current rule and original need a clearer relationship. Both unresolved captions must remain. Evidence: `04-noa-graded.png`. |
| 5 | Four destinations; clear action, weak sense of media | The list is understandable. Four identical bars look like a form. Make the same excerpt appear in four recognisable formats: group post, email, video page and clip. The archive stays visibly separate. Evidence: `05-distribution.png`. |
| 6 | Kindredraft published; readable but dominated by metadata | The title is repeated in the OS caption and inside the page. Classification and reviewer text occupy almost half the available reading space. Give Vera and the year a clear document header; keep institutional metadata as a quieter archival strip. Evidence: `06-kindredraft-published.png`. |
| 7 | Kindredraft as sent; emotionally coherent, comparison relies on memory | Nuala disappears between two separate states. The player has to remember the previous paragraph. Start with the published version, then use the one As sent press to reveal a visible comparison. No flashing, guide, rewards or timed hold on this felt page. Evidence: `07-kindredraft-sent.png`. |

## Recommended direction

Keep the 2016 OS and existing palette. Inside it, make the correction tool feel like an actual media workstation: a legible clip, a simple authored frame strip, one selected sentence, one current correction, and its visible result. It must remain one press per beat, with no professional editing chores or free trim controls.

Kindredraft should feel like a retained document: specific, carefully typeset, dated, versioned, and quiet. Its appeal comes from legibility and the material sense of a record. Felt text stays free of the platform’s charm. The system’s editing hand can be shown through the existing reviewer artefact and the difference between the versions.

Aesthetic changes should serve the story: a recognisable image, visible erasure, distinct publication formats, and meaningful empty space. Do not add general animation, dashboards, counts, decoration or progress rewards to fill space.

## Other implementation issue found during review

The new record pages still use the board mode internally. Board-idle notices and, in some circumstances, the board screensaver can therefore become eligible while a record is open. The redesign should exclude every open record/media page from board idling. This is a reading-protection fix, not a new timer or mechanic.

## Limits

Screenshots establish cropping, visible hierarchy, and comparison demands. They do not establish headset comfort, dyslexic-reader usability, screen-reader support or full accessibility compliance. The redesign needs a new browser capture and an in-headset note. The complete walk has not reached the Close yet and must be rerun after the redesign.

## Screens in flow order

### 1. Renata — understandable, dense

![Renata — understandable, dense](/Users/sergiogalvaoroxo/update-available-reinterp/out/design-e3-before/01-renata.png)

### 2. Noa’s video — image unclear

![Noa’s video — image unclear](/Users/sergiogalvaoroxo/update-available-reinterp/out/design-e3-before/02-noa-video.png)

### 3. Playback — edit relationship unclear

![Playback — edit relationship unclear](/Users/sergiogalvaoroxo/update-available-reinterp/out/design-e3-before/03-noa-playing.png)

### 4. Grade applied — visible change, clipped transcript

![Grade applied — visible change, clipped transcript](/Users/sergiogalvaoroxo/update-available-reinterp/out/design-e3-before/04-noa-graded.png)

### 5. Distribution — clear action, repetitive presentation

![Distribution — clear action, repetitive presentation](/Users/sergiogalvaoroxo/update-available-reinterp/out/design-e3-before/05-distribution.png)

### 6. Published record — readable, metadata dominates

![Published record — readable, metadata dominates](/Users/sergiogalvaoroxo/update-available-reinterp/out/design-e3-before/06-kindredraft-published.png)

### 7. As sent — readable, comparison depends on memory

![As sent — readable, comparison depends on memory](/Users/sergiogalvaoroxo/update-available-reinterp/out/design-e3-before/07-kindredraft-sent.png)


## Built visual revision

Sérgio approved Renata as the main-path video, hands and domestic space rather than a face, a simple media workstation, published-first comparison, warm 2016 software, distinct publication formats and visible retained copies. He confirmed the podcast stays retired. He approved all three shorter labels: “Vera · 2014 · Published”; “Perpetual licence: publish, adapt, reuse. Original kept.”; “New story received. Awaiting review.” The women’s own sentences remain whole.

- The new silent Renata recording uses authored canvas art in the existing palette. Separate fingers, sleeves, table, window and mug make the image readable. There is no real likeness or footage.
- A large preview, Play, four frames, full tracked transcript and one current correction form a single workstation. A cut leaves a visible gap. No dragging or editing chore was added.
- Noa shares the workstation. Her original strip remains ungraded; the house crop/grade changes the preview. The complete account and both unresolved captions fit.
- Kindredraft opens one published document. As sent reveals aligned source and published papers, with metadata kept below and the retained-source status above. No guide, glow or reading entry.
- Four publication formats carry Renata’s edited text. Three retained-copy papers carry Vera’s actual openings. The original stays visibly different from its published copies.
- Open archive pages cannot inherit board-idle notices, screensaver or Start-strip offers.

Fresh final captures: `out/design-e3-after/01-renata.png`, `04-noa-graded.png`, `05-distribution.png`, `06-kindredraft-published.png`, `07-kindredraft-sent.png`, and `out/tour-e3-v2/20-take-down-retains-original-surface.png`. These are actual canvas outputs, paired with room photographs. The full eight-beat tour is in `out/tour-e3-v2/`; the ignored-install route is in `out/tour-e3-v2-ignored/`.

The second pass resolves the observed clipping and comparison issues. It does not establish headset comfort or accessibility compliance. No headset test was performed. Full-walk evidence belongs in ERA3_V2_BUILT_.md.
