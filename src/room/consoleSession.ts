/**
 * ⚑ S364 — PLACEHOLDER for the shared console session (UiB job 14 Part B item 7). The console builder's branch
 * (job14-partB-console) replaces this file with the real one: the console's MatchMade instance, lit by the AI's offer,
 * played from the monitor window and the console on her bed alike. Until then nothing is ready and nothing draws.
 */
export interface ConsoleSession {
  readonly ready: boolean;
  readonly lit: boolean;
  light(): void;
  draw(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void;
  tap(u: number, v: number): void;
  frameKey(): string;
  readonly stats: { matches: number; percent: number };
  readonly playing: boolean;
}

let lit = false;
export const consoleSession: ConsoleSession = {
  ready: false,
  get lit() { return lit; },
  light() { lit = true; },
  draw() { /* nothing until the real session exists */ },
  tap() { /* nothing */ },
  frameKey() { return lit ? 'lit' : 'dark'; },
  stats: { matches: 0, percent: 0 },
  playing: false
};
