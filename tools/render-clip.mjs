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
 *
 * ⚑ S366 (UiB job 15, J15-02) — `--stills`: no video; one PNG per "signs" card (s4_v3.json `clip.signs.cards`), each
 * the card's full state just after its last tick (or its 5 / 5 stamp), written as signs-<frame>.png beside --out.
 * `--logical WxH` draws the clip at another in-piece size before scaling (default 320x180, the video's; the chat's
 * full-page takeover is about 443x249 in the 2026 browser's logical page).
 * ⚑ S370 — `--stills` also writes each sign's picture just before its tick (signs-<frame>-before-<n>.png: the AI's claim,
 * before its own evidence undoes it), every card at the end of its hold (card-NN.png, the Meridian card and the end slate
 * among them), and `--at 35.5,54` adds stills at given seconds. The video is one play of the clip (58 s since S370).
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createCanvas } from 'canvas';
import * as esbuild from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const argOf = (flag, dflt) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : dflt; };
const FPS = Number(argOf('--fps', '24'));
const WIDTH = Number(argOf('--width', '1280'));
const OUT = resolve(ROOT, argOf('--out', 'out/clip/the-great-becoming.mp4'));
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
const { drawContagionClip, CLIP_ONSETS, CLIP_HOLDS, CLIP_LOOP_SECONDS, V3 } = await import(bundle);
const DELAY = V3.clip.narratorDelay ?? 0.15;

// the clip is drawn at its in-piece size (about 320×180 logical px in the 2026 browser) and scaled up, as the
// screen's backing store does — drawing it straight at 1280 px leaves its text at its small-screen size
const [LOGICAL_W, LOGICAL_H] = argOf('--logical', '320x180').split('x').map(Number);
const SCALE = WIDTH / LOGICAL_W;
const canvas = createCanvas(WIDTH, Math.round(LOGICAL_H * SCALE));
const ctx = canvas.getContext('2d');
// ⚑ S364: node-canvas REJECTS a whole font string that names `-apple-system` and silently keeps the previous font, so
// every `fontFor(…, 'e4')` the clip sets was ignored here (captions at the default 10 px, signs in the last mono size);
// a browser just skips the name it doesn't know. Strip it on the way in, so the video shows what the piece shows.
const FONT = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ctx), 'font');
Object.defineProperty(ctx, 'font', { get() { return FONT.get.call(this); }, set(v) { FONT.set.call(this, String(v).replace(/-apple-system,\s*/g, '')); } });
ctx.imageSmoothingEnabled = false;
ctx.scale(SCALE, SCALE);

if (args.includes('--stills')) {
  // each signs card after its last beat has landed (and the quarter-second gold flash and the slam are over)
  mkdirSync(dirname(OUT), { recursive: true });
  const still = (t, name) => {
    ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
    drawContagionClip(ctx, t, 0, 0, LOGICAL_W, LOGICAL_H);
    const file = join(dirname(OUT), `${name}.png`);
    writeFileSync(file, canvas.toBuffer('image/png'));
    console.log(`still: ${name} at ${t.toFixed(2)} s → ${file}`);
  };
  for (const card of V3.clip.signs.cards) {
    const last = Math.max(...card.ticks, card.stampAt ?? 0);
    still(CLIP_ONSETS[card.frame] + last + 0.5, `signs-${card.frame}`);
    // ⚑ S370 — and each sign's picture just before its tick lands (the AI's claim, before its own evidence undoes it)
    card.ticks.forEach((tk, i) => still(CLIP_ONSETS[card.frame] + tk - 0.375, `signs-${card.frame}-before-${i + 1}`));
  }
  // ⚑ S370 — every card at the end of its hold (the Meridian card and the end slate among them)
  CLIP_ONSETS.forEach((t0, i) => still(t0 + CLIP_HOLDS[i] - 0.3, `card-${String(i).padStart(2, '0')}`));
  // `--at 35.5,37.25` adds stills at given seconds
  for (const s of argOf('--at', '').split(',').filter(Boolean)) still(Number(s), `at-${Number(s).toFixed(2)}`);
  rmSync(WORK, { recursive: true, force: true });
  process.exit(0);
}

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
