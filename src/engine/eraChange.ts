/**
 * ⚑ S347 — THE SEATED ERA CHANGE (UiB job 6). His 9 Nov note on job 5: use the space morph that shines and changes
 * "as the era change, in the browser and in the headset, while he sits in the chair. The room itself shines and
 * transforms around him." So, on every platform: no rise, no flight, no turn mid-air. The visitor stays in the chair
 * while the install runs and the room folds into its next year around them (clusterMorph + morphShine), then ONE slow
 * morph takes them into the new seat (the comfort rule's "at most one slow move into the new seat at the end").
 *
 * The landing's two halves are shared by the desktop's blink (app.ts) and the headset's re-form (xrComfort.ts), and
 * by the room's timeline (cluster.ts lands the new year's light exactly at the cut) — one number in one place.
 */
export const SEATED_ERA_CHANGE = true;
/** the landing morph: the new seat's picture arrives (the cut at its end), then the particles go */
export const LANDING = { cover: 2.6, reveal: 1.8 } as const;
export const LANDING_SECONDS = LANDING.cover + LANDING.reveal;
