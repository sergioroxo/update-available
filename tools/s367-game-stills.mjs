#!/usr/bin/env node
/**
 * S367 (UiB job 15 Part B) — MATCH MADE SIMPLE as a tug of war, photographed headless (no browser, no server).
 *
 *     node tools/s367-game-stills.mjs [--out out/s367/game] [--seed 7] [--only picture|game]
 *
 * Writes, each at 960 × 540 AND scaled to 300 px wide (the monitor window's small size, box-filtered the way a
 * smoothed downscale is), into the out dir:
 *   picture-sheet.png          the Pride '24 picture at filter 0, .3, .5, .7, .94, .99 (and Junie muted, for review)
 *   01-title  02-start  03-pull  04-counter  05-push  06-wall  07-stophere  08-collapse  09-end   (+ -300.png each)
 * The run is PLAYED like game_preview.mjs's: a seeded bot taps the first legal pair whenever it is her turn, and the
 * frames are caught by the game's own phases (probe.s), so the stills show what a player sees, not states set by hand
 * — except the 99% wall, which is the chat's own setProgress(98) followed by a played turn.
 * Prints a run log: the handle after each of her pulls and its pushes, so the drift can be judged.
 */
import { build } from 'esbuild';
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const OUT = join(ROOT, flag('out', 'out/s367/game'));
const SEED = Number(flag('seed', 7));
const ONLY = flag('only', 'all');
mkdirSync(OUT, { recursive: true });

// the modules touch a few browser globals at load (the motion preference, the ledger's unload wipe)
globalThis.window ??= globalThis;
globalThis.window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.window.addEventListener ??= () => {};
async function load(file, names) {
  const src = `export { ${names.join(', ')} } from '${join(ROOT, file)}';`;
  const out = await build({
    stdin: { contents: src, resolveDir: ROOT, loader: 'ts' }, bundle: true, write: false, format: 'esm', platform: 'node',
    loader: { '.json': 'json' }, logLevel: 'error',
    define: { __FESTIVAL__: 'false', __BUILD_TAG__: '"stills"', __APP_VERSION__: '"stills"', __BUILD_COMMIT__: '"stills"', __BUILD_DATE__: '"stills"' }
  });
  return import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
}

function painter(w, h) {
  const buf = Buffer.alloc(w * h * 4);
  return {
    buf, w, h, fillStyle: '#000000',
    fillRect(x, y, rw, rh) {
      const n = parseInt(String(this.fillStyle).slice(1, 7), 16);
      const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      for (let j = Math.max(0, Math.floor(y)); j < Math.min(h, Math.floor(y + rh)); j++)
        for (let i = Math.max(0, Math.floor(x)); i < Math.min(w, Math.floor(x + rw)); i++) {
          const o = (j * w + i) * 4; buf[o] = r; buf[o + 1] = g; buf[o + 2] = b; buf[o + 3] = 255;
        }
    }
  };
}
/** a box-filtered downscale to `tw` wide (what a smoothed drawImage does to the window's small copy) */
function shrink(src, tw) {
  const k = src.w / tw, th = Math.round(src.h / k), buf = Buffer.alloc(tw * th * 4);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const x0 = x * k, x1 = (x + 1) * k, y0 = y * k, y1 = (y + 1) * k;
    let r = 0, g = 0, b = 0, a = 0;
    for (let j = Math.floor(y0); j < Math.ceil(y1); j++) for (let i = Math.floor(x0); i < Math.ceil(x1); i++) {
      const wx = Math.min(x1, i + 1) - Math.max(x0, i), wy = Math.min(y1, j + 1) - Math.max(y0, j), wgt = wx * wy;
      const o = (Math.min(src.h - 1, j) * src.w + Math.min(src.w - 1, i)) * 4;
      r += src.buf[o] * wgt; g += src.buf[o + 1] * wgt; b += src.buf[o + 2] * wgt; a += wgt;
    }
    const o = (y * tw + x) * 4; buf[o] = r / a; buf[o + 1] = g / a; buf[o + 2] = b / a; buf[o + 3] = 255;
  }
  return { buf, w: tw, h: th };
}
function png({ buf, w, h }) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; buf.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const SMALL = [];
const save = (name, p, small = true) => {
  writeFileSync(join(OUT, `${name}.png`), png(p));
  if (small) { const q = shrink(p, 300); SMALL.push(q); writeFileSync(join(OUT, `${name}-300.png`), png(q)); }
};
/** every 300 px frame on one sheet, three across, in the order taken (the small window's read, side by side) */
function writeSheet() {
  if (!SMALL.length) return;
  const cols = 3, gap = 8, cw = 300, ch = SMALL[0].h, rows = Math.ceil(SMALL.length / cols);
  const sh = painter(cols * (cw + gap) + gap, rows * (ch + gap) + gap);
  sh.fillStyle = '#404040'; sh.fillRect(0, 0, sh.w, sh.h);
  SMALL.forEach((q, i) => {
    const ox = gap + (i % cols) * (cw + gap), oy = gap + Math.floor(i / cols) * (ch + gap);
    for (let y = 0; y < q.h; y++) q.buf.copy(sh.buf, ((oy + y) * sh.w + ox) * 4, y * q.w * 4, (y + 1) * q.w * 4);
  });
  writeFileSync(join(OUT, 'sheet-300.png'), png(sh));
}

if (ONLY === 'all' || ONLY === 'picture') {
  const { paintPride } = await load('src/games/pridePicture.ts', ['paintPride']);
  const F = [0, 0.3, 0.5, 0.7, 0.94, 0.99];
  const sheet = painter(3 * 470, 3 * 270);
  sheet.fillStyle = '#808080'; sheet.fillRect(0, 0, sheet.w, sheet.h);
  F.forEach((f, i) => paintPride(sheet, (i % 3) * 470 + 11, Math.floor(i / 3) * 270 + 9, 448, 252, { filter: f, t: 0 }));
  paintPride(sheet, 2 * 470 + 11, 2 * 270 + 9, 448, 252, { filter: 0.94, junieMute: 1, t: 0 });
  paintPride(sheet, 1 * 470 + 11, 2 * 270 + 9, 448, 252, { filter: 0.94, junieMute: 0.5, t: 0.5 });
  paintPride(sheet, 0 * 470 + 11, 2 * 270 + 9, 448, 252, { filter: 0.6, t: 0 });
  save('picture-sheet', sheet, false);
  const big = painter(960, 540); big.fillStyle = '#f6efe6'; big.fillRect(0, 0, 960, 540);
  paintPride(big, 60, 10, 840, 480, { filter: 0 });
  save('picture-whole', big);
  const half = painter(960, 540); half.fillStyle = '#f6efe6'; half.fillRect(0, 0, 960, 540);
  paintPride(half, 60, 10, 840, 480, { filter: 0.94 });
  save('picture-94', half);
  console.log('picture: wrote', OUT);
}

if (ONLY === 'all' || ONLY === 'game') {
  const { MatchMade } = await load('src/games/matchMade.ts', ['MatchMade']);
  const DT = 1 / 60;
  const shot = (g, name) => { const p = painter(g.w, g.h); g.draw(p); save(name, p); };
  /** a run: the seeded bot plays her turns after a short think; `until` is checked every frame */
  const runner = (g) => {
    const P = g.probe;
    const tapTile = (i) => { const q = P.tpos(i); g.tap(q.x + 25, q.y + 25); };
    let wait = 0.7, lastPushes = 0, lastEarned = 0;
    const log = [];
    const step = () => {
      g.tick(DT);
      const s = P.s;
      if (s.pushes !== lastPushes) { lastPushes = s.pushes; log.push(`  its push #${s.pushes}: ${s.lastPush.from}% → ${s.lastPush.to}%  (her matches ${s.earned}, its turn ${s.counterTurns})`); }
      if (s.earned !== lastEarned) { lastEarned = s.earned; log.push(`her match #${s.earned} (handle then ${s.progress}%)`); }
      if (s.canPlay) { wait -= DT; if (wait <= 0) { const m = P.move(); if (m) { tapTile(m[0]); tapTile(m[1]); } wait = 0.7; } }
    };
    const run = (sec, until = () => false) => { for (let t = 0; t < sec; t += DT) { step(); if (until(P.s)) return true; } return false; };
    const idle = (sec) => { for (let t = 0; t < sec; t += DT) g.tick(DT); };
    return { P, run, idle, log };
  };

  // ── the hand-drawn numbers (the end card's), every digit
  {
    const g = new MatchMade(), sh = painter(960, 300);
    sh.fillStyle = '#f6efe6'; sh.fillRect(0, 0, 960, 300);
    [[1, 20], [23, 230], [45, 440], [67, 650]].forEach(([n, x]) => g.probe.paintNumber(sh, n, x, 20, 0.82));
    [[89, 20], [0, 230], [99, 440]].forEach(([n, x]) => g.probe.paintNumber(sh, n, x, 160, 0.82));
    save('numerals', sh, false);
  }
  // ── run A: the stills, from the title to the plain page through STOP HERE
  {
    const g = new MatchMade(), { P, run, idle, log } = runner(g);
    P.seed(SEED);
    g.setProgress(94, true);                         // the session hands a new game the chat's ring
    idle(3); shot(g, '01-title');
    g.tap(480, 410); idle(1.2); shot(g, '02-start');
    run(30, (s) => s.tag === 'her'); idle(0.12); shot(g, '03-pull');
    run(30, (s) => s.actor === 'system' && s.phase === 'swap'); idle(0.09); shot(g, '04-counter');
    run(30, (s) => s.phase === 'push'); idle(0.36); shot(g, '05-push');
    run(30, (s) => s.actor === 'player' && s.phase === 'idle'); idle(0.3); shot(g, '05b-pushed');
    // play on: the drift
    run(200, (s) => s.earned >= 12 && s.actor === 'player' && s.phase === 'idle');
    idle(0.5); shot(g, '06a-midrun');
    // the 99% wall: the chat sets the ring high (its beat), she plays, and its push meets the wall
    run(60, (s) => s.actor === 'system' && s.phase === 'reach');
    g.setProgress(99); idle(0.05);
    run(30, (s) => s.phase === 'push'); idle(0.5); shot(g, '06-wall');
    run(30, (s) => s.actor === 'player' && s.phase === 'idle'); idle(0.6); shot(g, '06b-wall-held');
    const atWall = P.s.progress;
    // START → the menu → STOP HERE
    g.key('start'); idle(0.2); g.key('down'); g.key('down'); g.key('down'); idle(0.1); shot(g, '07-stophere');
    g.key('a'); idle(1.7); shot(g, '08-collapse');
    run(10, (s) => s.state === 'final'); idle(3); shot(g, '09-end');
    console.log(log.join('\n'));
    console.log(`run A: the wall held at ${atWall}% (walls ${P.s.walls}); state ${P.s.state}; filing "${g.takeFiling()}"; again ${g.takeFiling()}; original ${JSON.stringify(P.s.original)}`);
  }
  // ── run B: a whole run to the match limit — the seller's card, then its frame breaking
  {
    const g = new MatchMade(), { P, run, idle, log } = runner(g);
    P.seed(SEED + 1);
    g.setProgress(97, true);
    idle(3); g.tap(480, 410);
    run(600, (s) => s.state === 'end'); idle(2.8); shot(g, '10-card');
    const end = P.s.progress;
    run(20, (s) => s.state === 'final'); idle(3);
    console.log(log.slice(-12).join('\n'));
    console.log(`run B: 24 matches from 97% → the handle stopped at ${end}% after ${P.s.pushes} pushes; state ${P.s.state}; filing "${g.takeFiling()}"`);
  }
  console.log('game: wrote', OUT);
}
writeSheet();
