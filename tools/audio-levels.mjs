#!/usr/bin/env node
/**
 * S248 - the loudness baseline. Measures every shipped audio file (public/assets/audio/*.mp3 and the setup
 * advert's soundtrack) with ffmpeg's EBU R128 meter, then writes src/audio/levels.json { file: gainFactor }.
 * The mixer (src/audio/mix.ts) multiplies each file's gain under master x channel, so at system volume 100%
 * on headphones the piece sits at a comfortable level instead of full scale.
 *
 *   targets   music / room / film  -23 LUFS   voices & tapes  -20 LUFS   effects  -23 LUFS (short clips: RMS)
 *   limits    boost capped at +6 dB, and never past -1 dBFS true peak at master 1.0 (it can only clip if a
 *             caller asks for more than 1.0, and the mixer clamps that)
 *   output    src/audio/levels.json (gain factors) and out/audio-levels.md (the table)
 *
 * Usage:  node tools/audio-levels.mjs            (re-measure everything, write both files)
 *         node tools/audio-levels.mjs --dry      (print the table, write nothing)
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FFMPEG = existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg';
const dry = process.argv.includes('--dry');
const channels = JSON.parse(readFileSync(join(ROOT, 'src/audio/channels.json'), 'utf8'));
const voiceRe = new RegExp(channels.voicePattern);

const TARGET = { music: -23, room: -23, film: -23, effects: -23, voices: -20 };
const MAX_BOOST_DB = 6;
const PEAK_CEILING_DB = -1;

function channelOf(file) {
  if (channels.music.includes(file)) return 'music';
  if (channels.room.includes(file)) return 'room';
  if (channels.film.includes(file)) return 'film';
  if (channels.voices.includes(file) || voiceRe.test(file)) return 'voices';
  return 'effects';
}

function run(path, filter) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-nostats', '-i', path, '-vn', '-af', filter, '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  return r.stderr || '';
}

function measure(path) {
  const out = run(path, 'ebur128=peak=true');
  const sum = out.slice(out.lastIndexOf('Summary:'));
  const I = /I:\s+(-?[\d.]+|-inf)\s+LUFS/.exec(sum);
  const P = /Peak:\s+(-?[\d.]+|-inf)\s+dBFS/.exec(sum);
  let lufs = I && I[1] !== '-inf' ? parseFloat(I[1]) : -Infinity;
  const peak = P && P[1] !== '-inf' ? parseFloat(P[1]) : -Infinity;
  let how = 'LUFS';
  const o = run(path, 'astats=metadata=0:reset=0');
  const all = o.slice(o.lastIndexOf('Overall'));
  const m = /RMS level dB:\s+(-?[\d.]+)/.exec(all);
  const rms = m ? parseFloat(m[1]) : -Infinity;
  // ebur128 gates on 400 ms blocks: a clip shorter than that (or a file that is nearly all silence) reads -70 or
  // -inf. Fall back to the RMS, which is what the ear hears from a short sting. The same fallback covers a file
  // whose energy is sub-bass (K-weighting discounts it ~30 dB: startup_1997 reads -49 LUFS against -21 RMS).
  if (!(lufs > -69) || rms - lufs > 10) { lufs = rms; how = 'RMS'; }
  return { lufs, peak, how };
}

const files = readdirSync(join(ROOT, 'public/assets/audio')).filter((f) => f.endsWith('.mp3')).map((f) => ({ file: f, path: join(ROOT, 'public/assets/audio', f) }));
files.push({ file: 'lambyos_welcome_home.mp4', path: join(ROOT, 'public/assets/video/lambyos_welcome_home.mp4') });

const rows = [];
const levels = {};
for (const { file, path } of files) {
  const ch = channelOf(file);
  const m = measure(path);
  let db = TARGET[ch] - m.lufs;                       // dB needed to reach the target
  if (!Number.isFinite(db)) db = 0;
  db = Math.min(db, MAX_BOOST_DB);
  if (Number.isFinite(m.peak)) db = Math.min(db, PEAK_CEILING_DB - m.peak);   // never past the ceiling
  const gain = Math.round(Math.pow(10, db / 20) * 1000) / 1000;
  levels[file] = gain;
  rows.push({ file, ch, ...m, gainDb: db, gain, after: m.lufs + db });
}
rows.sort((a, b) => a.ch.localeCompare(b.ch) || a.file.localeCompare(b.file));

let md = '| file | channel | measured | peak | gain | gain dB | resulting |\n|---|---|---|---|---|---|---|\n';
for (const r of rows) md += `| ${r.file} | ${r.ch} | ${r.lufs.toFixed(1)} ${r.how} | ${r.peak.toFixed(1)} | ${r.gain} | ${r.gainDb >= 0 ? '+' : ''}${r.gainDb.toFixed(1)} | ${r.after.toFixed(1)} |\n`;
console.log(md);

if (!dry) {
  const sorted = Object.fromEntries(Object.entries(levels).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(join(ROOT, 'src/audio/levels.json'), JSON.stringify(sorted, null, 2) + '\n');
  mkdirSync(join(ROOT, 'out'), { recursive: true });
  writeFileSync(join(ROOT, 'out/audio-levels.md'), md);
  console.log(`wrote src/audio/levels.json (${rows.length} files) and out/audio-levels.md`);
}
