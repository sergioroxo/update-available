/**
 * ⚑ S400 — MATCH MADE SIMPLE (2026) on the 2026 era website (public/sites/2026/game.js, built by
 * tools/build-site-games.mjs). The game is the room's own (src/games/matchMade.ts), unchanged; the page draws the console
 * round it. In the piece the chat sets the handle at its beats (consoleSession.ts); on the page there is no chat, so the
 * handle starts where the game starts it when nothing has set it (matchMade.ts DEFAULT_PROGRESS).
 */
import { MatchMade } from '../games/matchMade';
import { runDeviceGame } from './shell';

runDeviceGame('matchmade', () => new MatchMade());
