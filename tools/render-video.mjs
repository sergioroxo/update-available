#!/usr/bin/env node
/**
 * OFFLINE VIDEO RENDERER — turns an in-build canvas surface into a real MP4.
 *
 * Written 2026-07-26 because Sérgio asked to review the New You infomercial as
 * a file rather than by driving the browser ("can you make me an mp4 file of it
 * so i can check?"). Screen-capturing the preview would have been the obvious
 * route and the wrong one: the sandboxed browser suspends rAF, so every
 * playthrough this project has recorded needed a MessageChannel pump and still
 * could not guarantee real-time frame pacing.
 *
 * This renders DETERMINISTICALLY instead. `NetVisionPlayerApp` already exposes
 * exactly the interface an offline renderer needs — `update(dt)` and
 * `draw(ctx)` — so we drive it at a fixed timestep against a node-canvas, write
 * every frame, and mux the real committed audio track with ffmpeg. Nothing is
 * captured, nothing is timed by wall clock, and the subtitles land on the frame
 * the data says they land on.
 *
 * The canvas is set up exactly as `src/desktop/os.ts` does it (512×384 logical,
 * ×3 backing store, `ctx.scale(3,3)` so layout stays logical) — a faithful
 * render, not an approximation.
 *
 * Usage:  node tools/render-video.mjs [--fps 24] [--out <path>]
 * Needs:  ffmpeg on PATH, and the `canvas` package (both already present).
 */
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createCanvas } from 'canvas';
import * as esbuild from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const argOf = (flag, dflt) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};

const FPS = Number(argOf('--fps', '24'));
const OUT = join(ROOT, argOf('--out', 'out/new_you_infomercial.mp4'));
const AUDIO = join(ROOT, 'public/assets/audio/discover_the_new_you_infomercial_tape03.mp3');
const WORK = join(ROOT, '.render-tmp');

// ── the browser globals the module graph touches, stubbed ────────────────────
// tapeAudio's releaseBus() reaches for Audio/window when the player closes; the
// renderer never plays sound (ffmpeg muxes the real track), so no-ops are both
// sufficient and honest — nothing here fakes a behaviour we then rely on.
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {} };
globalThis.document = globalThis.document ?? { addEventListener() {}, removeEventListener() {} };
globalThis.Audio = globalThis.Audio ?? class { play() { return Promise.resolve(); } pause() {} };

// ── bundle the app out of TypeScript so node can import it ───────────────────
mkdirSync(WORK, { recursive: true });
const entry = join(WORK, 'entry.ts');
const bundle = join(WORK, 'bundle.mjs');
writeFileSync(entry, `
  export { NetVisionPlayerApp, setNetVisionVariant } from '../src/desktop/apps/netvision';
  export { ERA1_CANVAS, RENDER_SCALE } from '../src/desktop/theme/era1';
  export { ledger } from '../src/state/ledger';
`);
await esbuild.build({
  entryPoints: [entry], bundle: true, outfile: bundle,
  format: 'esm', platform: 'neutral', target: 'es2022', loader: { '.json': 'json' },
  logLevel: 'error'
});

const { NetVisionPlayerApp, ERA1_CANVAS, RENDER_SCALE, ledger, setNetVisionVariant } = await import(bundle);
// ⚑ S207 — which version of the ad: participant (in the piece) | original (s2_media.json _docVariants)
const VARIANT = argOf('--variant', '');
if (VARIANT) setNetVisionVariant(VARIANT);
// ⚑ S207 — as in play since S205: his testimony is published before the video is offered, so the ad's
//   ACTUAL PARTICIPANT shot opens on his own Tape 04 frame (REAL STORIES. REAL CHANGE.)
if (!ledger.records.includes('testimony-online')) ledger.records.push('testimony-online');

// ── render, exactly as os.ts composes the surface ────────────────────────────
const W = ERA1_CANVAS.width * RENDER_SCALE;
const H = ERA1_CANVAS.height * RENDER_SCALE;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
ctx.scale(RENDER_SCALE, RENDER_SCALE); // all layout stays logical, as in os.ts

const app = new NetVisionPlayerApp();
const duration = app.duration ?? 114;
const total = Math.ceil(duration * FPS);
const dt = 1 / FPS;
const frames = join(WORK, 'frames');
rmSync(frames, { recursive: true, force: true });
mkdirSync(frames, { recursive: true });

process.stdout.write(`rendering ${total} frames at ${FPS}fps (${duration}s) …\n`);
for (let i = 0; i < total; i++) {
  app.update(dt);
  ctx.save();
  app.draw(ctx);
  ctx.restore();
  writeFileSync(join(frames, `f${String(i).padStart(6, '0')}.png`), canvas.toBuffer('image/png'));
  if (i % (FPS * 10) === 0) process.stdout.write(`  ${(i / FPS).toFixed(0)}s / ${duration}s\n`);
}

// ── mux with the real committed track ────────────────────────────────────────
mkdirSync(dirname(OUT), { recursive: true });
const hasAudio = existsSync(AUDIO);
const ff = [
  '-y', '-framerate', String(FPS), '-i', join(frames, 'f%06d.png'),
  ...(hasAudio ? ['-i', AUDIO] : []),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18',
  // nearest-neighbour upscale keeps the pixel discipline visible at review size
  '-vf', 'scale=iw*2:ih*2:flags=neighbor',
  ...(hasAudio ? ['-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
  OUT
];
execFileSync('ffmpeg', ff, { stdio: ['ignore', 'ignore', 'pipe'] });
rmSync(WORK, { recursive: true, force: true });
process.stdout.write(`\n✓ ${OUT}${hasAudio ? ' (with audio)' : ' (SILENT — track not found)'}\n`);
