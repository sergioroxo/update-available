/**
 * YOUR UPDATE HAS FAILED — entry point.
 * PC Simulator · SurvivingSOGICE · University of Bergen, CDN.
 *
 * Hard invariants (see CLAUDE.md + tools/check-invariants.mjs):
 * no runtime network calls, no storage of user input, ledger wiped on exit.
 */
import { startApp } from './engine/app';
import { startFlat } from './flat/flat';
import './state/ledger'; // installs the beforeunload wipe

const canvas = document.getElementById('app') as HTMLCanvasElement | null;
if (!canvas) throw new Error('missing #app canvas');

// ?flat=1 — the universal version: desktop canvas alone, no WebGL, no room
if (new URLSearchParams(window.location.search).get('flat') === '1') {
  startFlat(canvas);
} else {
  startApp(canvas);
}
