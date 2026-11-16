#!/usr/bin/env node
/**
 * ⚑ RETIRED (S396, UiB job 28 B6) — tools/s392-tv-probe.mjs was job 26 B's probe of the three room TVs: the view CONDUCTED
 * to a TV, the short tape stopping at End of Part 1, its chapter list and "▶" chips drawn on the glass, chapter rows and
 * Skip Ad pressed on the glass, the record card's margin panel, the Close playing the WEB copy. Every one of those is gone:
 * job 27 B (S394) replaced the TVs with the Lamby set brought close (no turns, no fades), and job 28 B (S396, his 16 Nov)
 * removed the Part 1 stop ("Play it all") and everything the player drew or published on the glass ("There is a play
 * button on the screen for a TV that already has a play button, that is unnecessary"). A rewrite without them would be a
 * copy of the set's probe, so its checks live there:
 *
 *     node tools/s394-lamby-tv-probe.mjs --port <vite port> [--mode desktop|xr|phone|all] [--only 1997|2016|2026]
 *
 * (the moment plays to the tape's end; put down by its body, ⏻ or the story's voice it pauses at that second; ▶ and the
 * era site's viewer go on from it; nothing drawn or pressable on the glass but the whole-glass play/pause; the lamps and
 * the deck's display show the state). The old probe is in git history (last at e5654654).
 */
console.error('tools/s392-tv-probe.mjs is retired (S396): the room TVs it probed are gone. Run tools/s394-lamby-tv-probe.mjs.');
process.exit(2);
