/**
 * YOUR UPDATE HAS FAILED — entry point.
 * PC Simulator · SurvivingSOGICE · University of Bergen, CDN.
 *
 * Hard invariants (see CLAUDE.md + tools/check-invariants.mjs):
 * no runtime network calls, no storage of user input, ledger wiped on exit.
 */
import { startApp } from './engine/app';
import { startFlat } from './flat/flat';
import { startLambyRig } from './lambyrig/lambyRig';
import { mountGameMenu } from './desktop/gameMenu';
import { mountOrientingCard } from './desktop/orientingCard';
import './state/ledger'; // installs the beforeunload wipe

const canvas = document.getElementById('app') as HTMLCanvasElement | null;
if (!canvas) throw new Error('missing #app canvas');

const query = new URLSearchParams(window.location.search);
const reinterp = query.get('reinterp') === '1';
if (reinterp) document.documentElement.dataset.reinterp = '1';

// ?facet=tw|tm|nb|all — debug override forcing a fluid-niche facet state
// (reinterp + 3D only; ignored by flat). No param = the era default.
const FACET_CODES = { tw: 'transfem', tm: 'transmasc', nb: 'nonbinary', all: 'all' } as const;
const facet = FACET_CODES[query.get('facet') as keyof typeof FACET_CODES];

// reinterp 3D review tools (all ignored by flat; none reachable in play):
// ?era=2|3|4 = that era's open cluster + light rig, settled; ?morph=2|3|4 =
// watch the E1→EN morph play live; ?reveal=1 = the O7 first-filing state;
// ?close=1 = the point-cloud Close.
const ERA_CODES = { '2': 'e2', '3': 'e3', '4': 'e4' } as const;
const era = ERA_CODES[query.get('era') as keyof typeof ERA_CODES];
/** ⚑ AN UNRECOGNISED `?era=` USED TO FAIL IN SILENCE, 2026-08-24. The codes are
 *  NUMERIC — `?era=3` — and `?era=e3` (which is what the era is called
 *  everywhere else in this codebase, and what several review scripts and at
 *  least one agent brief used all day) simply resolves to `undefined`, so the
 *  pre-seated review branch never runs and the piece boots to the entrance as
 *  if no parameter had been given. Nothing said so. Reviews then either lost an
 *  hour or, worse, believed they were measuring an era they were not in.
 *  ⚑ Review params are frame-voice diagnostics, never the piece's voice, so a
 *  console line is the right register: a player never passes this and a
 *  reviewer always reads the console. */
const eraParam = query.get('era');
if (eraParam !== null && era === undefined) {
  console.warn(
    `[reinterp] ?era=${eraParam} is not a recognised era. Use ?era=2 | 3 | 4 ` +
    `(numeric, not "e3"). Booting to the entrance instead.`
  );
}
const morphDemo = ERA_CODES[query.get('morph') as keyof typeof ERA_CODES];
const close = query.get('close') === '1';
const reveal = query.get('reveal') === '1';
// ?nobatch=1 — disable static batching (draw-call A/B; review tool only)
const nobatch = query.get('nobatch') === '1';
// review-tool jumps (?era=/?morph=/?close=/?reveal=) exist to look at 3D
// states, not to play the opening — app.ts already bypasses O1's own
// overlay for these same four params (see startApp's options.reinterp
// branch); the pre-fiction orienting card is one layer earlier and follows
// the same convention rather than adding an extra click in front of a
// review jump.
const reviewMode = !!(era || morphDemo || close || reveal);

function launch(): void {
  // ⚑ ?flat=1 — a REVIEW TOOL: the desktop canvas alone, no WebGL, no room,
  // for inspecting 2D work without the space around it. Corrected 2026-08-06
  // by Sérgio — it is NOT a fallback and not an audience target (the old
  // "universal version" wording here was the misreading; see
  // docs/REINTERP_THE_LOOK_MODES_2026-08-06.md). The fallback when VR is not
  // possible is the browser 3D ROOM, which is a first-class build with two
  // look-modes of its own: drag (desktop) and gyro (phone/tablet, S80).
  if (query.get('flat') === '1') startFlat(canvas as HTMLCanvasElement, { reinterp });
  else void startApp(canvas as HTMLCanvasElement, { reinterp, facet, era, morphDemo, close, reveal, nobatch });
}

// ?lambyrig=1 — standalone procedural assistant rig lab; no OS integration,
// no orienting card/game menu (out of scope for that dev tool).
if (query.get('lambyrig') === '1') {
  startLambyRig(canvas);
} else if (reinterp) {
  // R28-4: the game menu (Esc + the persistent corner glyph) mounts FIRST,
  // before either engine starts and before the orienting card below — the
  // hard "Esc/pause works from every state" law (CLAUDE.md REINTERP
  // AMENDMENTS §3/§4) includes the pre-fiction card itself.
  mountGameMenu();
  if (reviewMode) {
    launch();
  } else {
    // R28-3 (minimal): the orienting card precedes O1 on a fresh load only.
    const card = mountOrientingCard((choice) => {
      // S162 / F-01: the choice itself already did its work (the phone card asked
      // the device; the headset card requested the session) — the room opens the same
      document.documentElement.dataset.door = choice;
      card.destroy();
      launch();
    });
  }
} else {
  launch();
}
