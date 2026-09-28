/**
 * ⚑ S189 — PHASE 4's GAMES (docs/reinterp/PLAN_PHASE4_GAMES_2026-09-27.md). Each era's game is a small,
 * self-contained program that draws its own screen as pixel art (only `fillStyle` + `fillRect`, so the
 * preview tool can play it headless) and knows nothing about the room: src/room/heldDevice.ts lifts the
 * device, routes the presses (its buttons, or a tap on its glass) and uploads the screen when it changes.
 *
 * The one idea that holds them together (his, 2026-09-27/28): each is the apparatus gamifying the same
 * thing — fitting a life into a shape. The satire is always the SELLER's: the game is the programme's
 * product, never the player's desire and never queer people or things.
 */
import type { Painter } from '../room/calendarArt';

export type GameKey = 'left' | 'right' | 'up' | 'down' | 'a' | 'b' | 'start';

export interface DeviceGame {
  readonly w: number;
  readonly h: number;
  tick(dt: number): void;
  draw(c: Painter): void;
  /** what the screen shows now, as a key — the device redraws and uploads only when it changes */
  frameKey(): string;
  key?(k: GameKey): void;
  /** a tap on the glass, in screen pixels */
  tap?(x: number, y: number): void;
  /** the line to file when a run ends — returned once, then null */
  takeFiling(): string | null;
}
