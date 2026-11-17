/**
 * ⚑ S400 — FIT IN (1997) on the 1997 era website (public/sites/1997/game.js, built by tools/build-site-games.mjs). The
 * game is the room's own (src/games/fitIn.ts), unchanged; the page draws the handheld round it (tools/gen_era_sites.mjs).
 */
import { FitIn } from '../games/fitIn';
import { runDeviceGame } from './shell';

runDeviceGame('fitin', () => new FitIn());
