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

// ?lambyrig=1 — standalone procedural assistant rig lab; no OS integration.
if (query.get('lambyrig') === '1') {
  startLambyRig(canvas);
// ?flat=1 — the universal version: desktop canvas alone, no WebGL, no room
} else if (query.get('flat') === '1') {
  startFlat(canvas, { reinterp });
} else {
  startApp(canvas, { reinterp, facet });
}
