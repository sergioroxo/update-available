/**
 * ⚑ S400 — CLEAR (2003) on the 2003 era website (public/sites/2003/game.js, built by tools/build-site-games.mjs). The
 * game is the room's own (src/games/clear.ts), unchanged; the page draws the flip phone round it.
 */
import { Clear } from '../games/clear';
import { runDeviceGame } from './shell';

runDeviceGame('clear', () => new Clear());
