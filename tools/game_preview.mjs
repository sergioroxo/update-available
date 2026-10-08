#!/usr/bin/env node
/**
 * GAME PREVIEW — the handheld games (src/games/*.ts) as PNGs, without the browser.
 *
 *     node tools/game_preview.mjs [tag] [scale]               # → out/games/fitin-<tag>-{title,play,cheer,pause,end}.png (default ×4)
 *     node tools/game_preview.mjs [tag] [scale] --game clear  # → out/games/clear-<tag>-{title,play,pause,end}.png (S222; default ×3)
 *     node tools/game_preview.mjs [tag] [scale] --game all    # both
 *
 * ⚑ WHY (S221). The games draw only with fillStyle + fillRect (src/games/types.ts), so they paint into a buffer
 * exactly as calendar_preview.mjs paints the calendar pages. A look at every screen of a 160 × 144 game costs a
 * second this way, against a walk and a still per look. States the stills need (a cheer, the pause, the end
 * card) are set directly on the game object: this shows what a screen LOOKS like, it proves nothing about how
 * a player reaches it (tools/walk.mjs does that).
 */
import { build } from 'esbuild';
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const argv = process.argv.slice(2);
const gi = argv.indexOf('--game');
const GAME = gi >= 0 ? argv.splice(gi, 2)[1] : 'fitin';
const TAG = argv[0] ?? 'now';
const SCALE_ARG = argv[1];
globalThis.window ??= globalThis;
/** a game module, bundled for node (the games import their JSON and the theme; nothing in them needs a DOM) */
async function load(file) {
  const out = await build({ entryPoints: [join(ROOT, file)], bundle: true, write: false, format: 'esm', platform: 'node', loader: { '.json': 'json' } });
  return import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
}

function painter(w, h) {
  const buf = Buffer.alloc(w * h * 4);
  return {
    buf, fillStyle: '#000000', globalAlpha: 1,
    fillRect(x, y, rw, rh) {
      const n = parseInt(String(this.fillStyle).slice(1, 7), 16);
      for (let j = Math.max(0, Math.floor(y)); j < Math.min(h, Math.floor(y + rh)); j++)
        for (let i = Math.max(0, Math.floor(x)); i < Math.min(w, Math.floor(x + rw)); i++) {
          const o = (j * w + i) * 4; buf[o] = (n >> 16) & 255; buf[o + 1] = (n >> 8) & 255; buf[o + 2] = n & 255; buf[o + 3] = 255;
        }
    }
  };
}
function png(buf, w, h, s) {
  const W = w * s, H = h * s, raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; for (let x = 0; x < W; x++) { const si = ((Math.floor(y / s) * w) + Math.floor(x / s)) * 4, di = y * (W * 4 + 1) + 1 + x * 4; buf.copy(raw, di, si, si + 4); } }
  const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const dir = join(ROOT, 'out/games'); mkdirSync(dir, { recursive: true });
const snapper = (g, id, scale) => (name) => { const p = painter(g.w, g.h); g.draw(p); writeFileSync(join(dir, `${id}-${TAG}-${name}.png`), png(p.buf, g.w, g.h, scale)); };

async function fitIn() {
  const { FitIn } = await load('src/games/fitIn.ts');
  const g = new FitIn(), snap = snapper(g, 'fitin', Number(SCALE_ARG ?? 4));
  for (let i = 0; i < 30; i++) g.tick(1 / 30);
  snap('title');
  g.key('start'); for (let i = 0; i < 20; i++) g.tick(1 / 30);
  snap('play');
  g.cheer = { t: 1, s: 'TO THE TOP!' }; g.hintT = 9; snap('cheer'); g.cheer = null;
  g.mode = 'pause'; snap('pause');
  g.mode = 'end'; g.placedCount = 7; snap('end');
}

/**
 * ⚑ S222 — CLEAR (240 × 320). Unlike FIT IN's stills these are PLAYED, not set: a small goal-aware bot taps the
 * glass (at the first ball of the loaded colour its line would touch, preferring a gold-ringed one) every second (the README's slow player),
 * so the mid-game frame has a stained groove, letters in the tray and the Partner talking; the end card is the
 * real TIME UP path (the clock forced low), through the wave and the read-out. Compare with v8's stills
 * (Pc_Simulation/Games_Proposals_2026-10-08_clear_v8/stills/v8_*.png, which are ×3).
 */
async function clear() {
  const { Clear } = await load('src/games/clear.ts');
  const g = new Clear(), snap = snapper(g, 'clear', Number(SCALE_ARG ?? 3));
  const run = (sec, every = 0) => {
    let next = 0;
    for (let t = 0; t < sec; t += 1 / 60) {
      g.tick(1 / 60);
      if (every && g.mode === 'play' && t >= next) { next = t + every; botShot(); }
    }
  };
  const botShot = () => {
    let best = null;
    for (let a = -Math.PI; a < Math.PI; a += Math.PI / 90) {
      const tr = g.trace(a); if (tr.hit === null) continue;
      const b = g.beads[tr.hit]; if (b.k !== g.cur) continue;
      const score = (b.ch && g.needCount(b.ch) > 0 ? 2 : 1) - tr.d / 1000;
      if (!best || score > best.score) best = { a, score };
    }
    const a = best ? best.a : Math.random() * Math.PI * 2;
    g.tap(120 + Math.cos(a) * 60, 165 + Math.sin(a) * 60);
  };
  run(3.4); snap('title');                                        // the demo's letters landed in its tray
  g.tap(120, 200); run(16, 1.0); snap('play');                    // played: a slow bot breaks what it can
  g.key('start'); run(0.5); snap('pause'); g.key('start');
  g.tLeft = 0.05; run(8); snap('end');                            // TIME UP → the wave → the read-out → the card
  console.log('clear: mode', g.mode, 'end', g.endWhy, 'filled', g.slots.filter((s) => s.st === 2).length, '/', g.slots.filter((s) => s.st !== 3).length, 'filing', g.takeFiling());
}

if (GAME === 'fitin' || GAME === 'all') await fitIn();
if (GAME === 'clear' || GAME === 'all') await clear();
console.log('wrote', dir, TAG, GAME);
