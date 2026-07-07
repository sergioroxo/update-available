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
const morphDemo = ERA_CODES[query.get('morph') as keyof typeof ERA_CODES];
const close = query.get('close') === '1';
const reveal = query.get('reveal') === '1';

// ?lambyrig=1 — standalone procedural assistant rig lab; no OS integration.
if (query.get('lambyrig') === '1') {
  startLambyRig(canvas);
// ?flat=1 — the universal version: desktop canvas alone, no WebGL, no room
} else if (query.get('flat') === '1') {
  startFlat(canvas, { reinterp });
} else {
  void startApp(canvas, { reinterp, facet, era, morphDemo, close, reveal });
}
