#!/usr/bin/env node
/**
 * ⚑ S357p — OFFLINE RENDER OF 2026's CLIP, "THE GREAT BECOMING" (Sérgio, 11 Nov: "Can I see a video of this?").
 *
 * Same method as tools/render-video.mjs: no screen capture. `drawContagionClip(ctx, t, …)` is a pure function of
 * time, so it is drawn at a fixed frame rate on a node-canvas, and ffmpeg muxes the real committed audio — the
 * music bed (clip_music.mp3) and the narrator's lines (clip_narr_<i>.mp3), each started where the piece starts it
 * (CLIP_ONSETS[i] + narratorDelay, as startClipSound does). One loop of the clip.
 *
 * Fonts: the clip asks for Inter; until it is vendored the stack falls through to the system sans (as in the
 * browser without it).
 *
 * Usage:  node tools/render-clip.mjs [--fps 24] [--width 1280] [--out out/clip/the-great-becoming.mp4]
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createCanvas } from 'canvas';
import * as esbuild from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const argOf = (flag, dflt) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : dflt; };
const FPS = Number(argOf('--fps', '24'));
const WIDTH = Number(argOf('--width', '1280'));
const HEIGHT = Math.round(WIDTH * 9 / 16);
const OUT = join(ROOT, argOf('--out', 'out/clip/the-great-becoming.mp4'));
const AUDIO = join(ROOT, 'public/assets/audio');
const WORK = join(ROOT, '.render-clip-tmp');

// the module graph reaches for browser globals (tapeAudio); the renderer plays nothing, ffmpeg muxes the files
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {}, setInterval, clearInterval, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { search: '' }, devicePixelRatio: 1 };
globalThis.location = globalThis.location ?? { search: '', href: '' };
globalThis.navigator = globalThis.navigator ?? { userAgent: 'node' };
globalThis.document = globalThis.document ?? { addEventListener() {}, removeEventListener() {} };
globalThis.Audio = globalThis.Audio ?? class { play() { return Promise.resolve(); } pause() {} };

rmSync(WORK, { recursive: true, force: true });
mkdirSync(join(WORK, 'frames'), { recursive: true });
const entry = join(WORK, 'entry.ts');
const bundle = join(WORK, 'bundle.mjs');
writeFileSync(entry, `export { drawContagionClip, CLIP_ONSETS, CLIP_HOLDS, CLIP_LOOP_SECONDS } from '../src/desktop/apps/contagionClip';
export { default as V3 } from '../data/dialog/s4_v3.json';\n`);
await esbuild.build({ entryPoints: [entry], bundle: true, outfile: bundle, format: 'esm', platform: 'neutral',
  target: 'es2022', loader: { '.json': 'json' }, logLevel: 'error',
  define: { __FESTIVAL__: 'false', __BUILD_TAG__: '"clip"', __APP_VERSION__: '"clip"', __BUILD_COMMIT__: '"clip"', __BUILD_DATE__: '""' } });
const { drawContagionClip, CLIP_ONSETS, CLIP_LOOP_SECONDS, V3 } = await import(bundle);
const DELAY = V3.clip.narratorDelay ?? 0.15;

// the clip is drawn at its in-piece size (about 320×180 logical px in the 2026 browser) and scaled up, as the
// screen's backing store does — drawing it straight at 1280 px leaves its text at its small-screen size
const LOGICAL_W = 320, LOGICAL_H = 180, SCALE = WIDTH / LOGICAL_W;
const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
ctx.scale(SCALE, SCALE);
const total = Math.ceil(CLIP_LOOP_SECONDS * FPS);
for (let n = 0; n < total; n++) {
  ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
  drawContagionClip(ctx, n / FPS, 0, 0, LOGICAL_W, LOGICAL_H);
  writeFileSync(join(WORK, 'frames', `f${String(n).padStart(5, '0')}.png`), canvas.toBuffer('image/png'));
}

// audio: the bed for one loop, each narrator line delayed to its onset, mixed without loudness normalisation
const inputs = ['-i', join(AUDIO, 'clip_music.mp3')];
const legs = ['[1:a]volume=0.55[m]'];
const labels = ['[m]'];
CLIP_ONSETS.forEach((t0, i) => {
  inputs.push('-i', join(AUDIO, `clip_narr_${i}.mp3`));
  const ms = Math.round((t0 + DELAY) * 1000);
  legs.push(`[${i + 2}:a]adelay=${ms}|${ms}[n${i}]`);
  labels.push(`[n${i}]`);
});
const filter = `${legs.join(';')};${labels.join('')}amix=inputs=${labels.length}:normalize=0:duration=first[a]`;
mkdirSync(dirname(OUT), { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(WORK, 'frames', 'f%05d.png'),
  ...inputs, '-filter_complex', filter, '-map', '0:v', '-map', '[a]', '-t', String(CLIP_LOOP_SECONDS),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', OUT]);
rmSync(WORK, { recursive: true, force: true });
console.log(`clip: ${total} frames, ${CLIP_LOOP_SECONDS.toFixed(1)} s, ${CLIP_ONSETS.length} narrator lines → ${OUT}`);
