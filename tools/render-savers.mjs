#!/usr/bin/env node
/**
 * ⚑ S208 — render the four eras' screensavers to MP4 (his, 2026-10-02: "videos of the screensavers… for my
 * presentation… to explore the narrative"). Deterministic: node-canvas draws src/desktop/apps/screensaver.ts frame
 * by frame at each era's own screen size and the game's own scale (×3), then ffmpeg encodes. Silent: the screensavers
 * have no sound in the piece either.
 *
 * Usage:  node tools/render-savers.mjs [--seconds 40] [--fps 24] [--out out/screensavers]
 *         node tools/render-savers.mjs --only lambs
 * Writes one file per saver: 1997a_starfield, 1997b_walk_on, 2003_flock, 2016_lock_screen, 2026_orb (.mp4).
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createCanvas } from 'canvas';
import * as esbuild from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const argOf = (flag, dflt) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : dflt; };
const SECONDS = Number(argOf('--seconds', '40'));
const FPS = Number(argOf('--fps', '24'));
const OUT = join(ROOT, argOf('--out', 'out/screensavers'));
const ONLY = argOf('--only', '');
const WORK = join(ROOT, '.render-savers-tmp');
const SCALE = 3;

// the WALK ON saver reads its letters off an offscreen canvas; node-canvas stands in for the browser's
globalThis.document = globalThis.document ?? { createElement: () => createCanvas(1, 1) };

mkdirSync(WORK, { recursive: true });
const entry = join(WORK, 'entry.ts');
const bundle = join(WORK, 'bundle.mjs');
writeFileSync(entry, `export { Screensaver } from '../src/desktop/apps/screensaver';\n`);
await esbuild.build({ entryPoints: [entry], bundle: true, outfile: bundle, format: 'esm', platform: 'neutral',
  target: 'es2022', loader: { '.json': 'json' }, logLevel: 'error' });
const { Screensaver } = await import(bundle);

/** each era's screen, at its logical size (era1.ts ERA1_CANVAS, era3Devices.ts LOGICAL) */
const SAVERS = [
  { name: '1997a_starfield', kind: 'stars', w: 512, h: 384, seed: 1997 },
  { name: '1997b_walk_on', kind: 'text', w: 512, h: 384, seed: 1997 },
  { name: '2003_flock', kind: 'lambs', w: 512, h: 384, seed: 2003 },
  { name: '2016_lock_screen', kind: 'lock', w: 676, h: 390, seed: 2016, clock: '9:41', waiting: 3 },
  { name: '2026_orb', kind: 'orb', w: 710, h: 384, seed: 2026, line: 'press to continue' }
].filter((s) => !ONLY || s.kind === ONLY || s.name.includes(ONLY));

mkdirSync(OUT, { recursive: true });
for (const S of SAVERS) {
  const saver = new Screensaver(S.kind, S.seed);
  if (S.clock) saver.clock = S.clock;
  if (S.waiting) saver.waitingFrom = S.waiting;
  if (S.line) saver.line = S.line;
  const canvas = createCanvas(S.w * SCALE, S.h * SCALE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.scale(SCALE, SCALE);
  const frames = join(WORK, 'frames');
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });
  const total = Math.round(SECONDS * FPS);
  for (let i = 0; i < total; i++) {
    saver.update(1 / FPS);
    ctx.save(); saver.draw(ctx, S.w, S.h); ctx.restore();
    writeFileSync(join(frames, `f${String(i).padStart(6, '0')}.png`), canvas.toBuffer('image/png'));
  }
  const out = join(OUT, `${S.name}.mp4`);
  // even dimensions for yuv420p; nearest-neighbour keeps the pixels square
  execFileSync('ffmpeg', ['-y', '-framerate', String(FPS), '-i', join(frames, 'f%06d.png'),
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=neighbor', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', out],
    { stdio: ['ignore', 'ignore', 'pipe'] });
  process.stdout.write(`✓ ${out}\n`);
}
rmSync(WORK, { recursive: true, force: true });
