#!/usr/bin/env node
/**
 * tools/freesound.mjs — verify and audition Freesound candidates, licence-first.
 *
 * ⚑ THE KEY NEVER TOUCHES THIS REPO OR ANY TRANSCRIPT. It is read from the
 * environment or from a file in your home directory, used in an Authorization
 * header, and never printed — including in errors, which are redacted below. Do
 * not paste it into a chat, a commit, or this file.
 *
 *   echo 'YOUR_KEY' > ~/.freesound_key && chmod 600 ~/.freesound_key
 *   node tools/freesound.mjs verify 445952 207994
 *
 * or, if you would rather not have it on disk at all:
 *
 *   FREESOUND_API_KEY=... node tools/freesound.mjs verify 445952
 *
 * ⚑ WHAT A TOKEN CAN AND CANNOT DO, honestly. A Freesound API key (token auth)
 * gives search and metadata and the ~128 kbps PREVIEWS. It does NOT give the
 * original WAV/FLAC — that needs OAuth2, i.e. signing in as you, which this
 * tool deliberately does not do. So the split is:
 *
 *   this tool          → verifies the licence, the duration, the rate, the name,
 *                        and pulls a preview so a candidate can be AUDITIONED
 *   you, in a browser  → download the original for anything that survives
 *
 * A preview is a lossy file; shipping one means transcoding lossy→lossy, and for
 * a 60 s bed that is audible. Audition from the preview, ship from the original.
 *
 * COMMANDS
 *   verify <id...>     licence + metadata for each; EXITS NONZERO if any id is
 *                      not CC0 or CC-BY (the project is public and goes to
 *                      festivals — NonCommercial is unusable, not merely awkward)
 *   audition <id...>   verify, then save each hq preview to the audition dir
 *   shortlist          verify every id mentioned in
 *                      docs/reinterp/SOUND_SHORTLIST_2026-09-02.md — the
 *                      licences in that file were read off pages by an agent and
 *                      have never been checked against the API
 *   licenses <id...>   emit paste-ready rows for assets/LICENSES.md
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const AUDITION = join(ROOT, '.audition'); // gitignored; previews are not assets

/** ⚑ read once, hold in a closure, never log */
function apiKey() {
  const fromEnv = process.env.FREESOUND_API_KEY;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  const file = join(homedir(), '.freesound_key');
  if (existsSync(file)) {
    const k = readFileSync(file, 'utf8').trim();
    if (k) return k;
  }
  console.error(
    'No Freesound key found.\n' +
    "  echo 'YOUR_KEY' > ~/.freesound_key && chmod 600 ~/.freesound_key\n" +
    '  (or set FREESOUND_API_KEY in the environment)\n' +
    'Get one at https://freesound.org/apiv2/apply/ — it is free and instant.'
  );
  process.exit(2);
}

/** every error message goes through this: a key must never reach a log */
function redact(s, key) {
  return String(s).split(key).join('«KEY»');
}

/** the only licences this project can use — see assets/LICENSES.md */
const OK_LICENCE = /creativecommons\.org\/(publicdomain\/zero\/1\.0|licenses\/by\/(3\.0|4\.0))/i;
const NAME = {
  'http://creativecommons.org/publicdomain/zero/1.0/': 'CC0',
  'https://creativecommons.org/publicdomain/zero/1.0/': 'CC0',
  'http://creativecommons.org/licenses/by/3.0/': 'CC-BY 3.0',
  'https://creativecommons.org/licenses/by/3.0/': 'CC-BY 3.0',
  'http://creativecommons.org/licenses/by/4.0/': 'CC-BY 4.0',
  'https://creativecommons.org/licenses/by/4.0/': 'CC-BY 4.0'
};

/** ⚑ 60 requests a minute, and the API says so by refusing. A verify pass over
 *  ~60 candidates went straight through that ceiling and reported the last one
 *  as an ERROR — which, in a licence-checking tool, is the worst possible way to
 *  fail: it looks exactly like an unusable sound. Throttle, and retry a 429
 *  rather than reporting it. */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const GAP_MS = 1150; // 52/min, comfortably under the stated 60
let lastCall = 0;
async function api(url, key) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const wait = GAP_MS - (Date.now() - lastCall);
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    const res = await fetch(url, { headers: { Authorization: `Token ${key}` } });
    if (res.status === 429) { await sleep(8000 * (attempt + 1)); continue; }
    return res;
  }
  throw new Error('throttled four times — wait a minute and re-run');
}

async function fetchSound(id, key) {
  const url = `https://freesound.org/apiv2/sounds/${encodeURIComponent(id)}/`;
  const res = await api(url, key);
  if (!res.ok) {
    throw new Error(redact(`sound ${id}: HTTP ${res.status} ${await res.text()}`, key));
  }
  return res.json();
}

function report(s) {
  const lic = NAME[s.license] ?? s.license;
  const ok = OK_LICENCE.test(s.license || '');
  const flag = ok ? '  OK ' : '⚑ NO ';
  console.log(
    `${flag} ${String(s.id).padEnd(8)} ${lic.padEnd(10)} ` +
    `${String(Math.round(s.duration * 10) / 10 + 's').padEnd(8)} ` +
    `${String(s.samplerate ?? '?').padEnd(6)} ${(s.type ?? '?').padEnd(5)} ` +
    `${(s.username ?? '?').padEnd(18)} ${(s.name ?? '').slice(0, 46)}`
  );
  if (!ok) {
    console.log(`        ⚑ UNUSABLE: ${lic}. This repo is public and the work is exhibited —`);
    console.log('          NonCommercial and Sampling+ are not options. Drop this candidate.');
  }
  return ok;
}

const idsFromShortlist = () => {
  const p = join(ROOT, 'docs/reinterp/SOUND_SHORTLIST_2026-09-02.md');
  const txt = readFileSync(p, 'utf8');
  return [...new Set([...txt.matchAll(/freesound\.org\/(?:people\/[^/]+\/)?sounds\/(\d+)/g)]
    .map(m => m[1]))];
};

const [cmd, ...args] = process.argv.slice(2);
const key = apiKey();
let ids = args;
if (cmd === 'shortlist') ids = idsFromShortlist();
if (!cmd || !['verify', 'audition', 'shortlist', 'licenses'].includes(cmd) || ids.length === 0) {
  console.error('usage: node tools/freesound.mjs verify|audition|licenses <id...>   |   shortlist');
  process.exit(2);
}

console.log(`     ${'id'.padEnd(8)} ${'licence'.padEnd(10)} ${'dur'.padEnd(8)} ${'rate'.padEnd(6)} ${'type'.padEnd(5)} ${'by'.padEnd(18)} name`);
let bad = 0;
const rows = [];
for (const id of ids) {
  let s;
  try { s = await fetchSound(id, key); }
  catch (e) { console.log(`⚑ ERR  ${String(id).padEnd(8)} ${e.message}`); bad++; continue; }
  if (!report(s)) bad++;
  rows.push(s);
  if (cmd === 'audition' && OK_LICENCE.test(s.license || '')) {
    const prev = s.previews?.['preview-hq-mp3'];
    if (!prev) { console.log('        (no preview available)'); continue; }
    const r = await api(prev, key);
    if (!r.ok) { console.log(`        (preview HTTP ${r.status})`); continue; }
    mkdirSync(AUDITION, { recursive: true });
    const out = join(AUDITION, `${s.id}_${(s.name || 'sound').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 40)}.mp3`);
    writeFileSync(out, Buffer.from(await r.arrayBuffer()));
    console.log(`        ♪ ${out.replace(ROOT + '/', '')}`);
  }
}

if (cmd === 'licenses') {
  console.log('\n--- paste into assets/LICENSES.md ---\n');
  console.log('| file | source | author | licence |');
  console.log('|---|---|---|---|');
  for (const s of rows) {
    console.log(`| \`<your filename>\` | [freesound #${s.id}](https://freesound.org/s/${s.id}/) — "${s.name}" | ${s.username} | ${NAME[s.license] ?? s.license} |`);
  }
}

console.log(
  `\n${ids.length} checked · ${ids.length - bad} usable · ${bad} rejected.` +
  (cmd === 'audition' ? `\n⚑ Previews are lossy. Audition from these; download the ORIGINAL for anything you keep.` : '') +
  `\n⚑ Every file you download gets its row in assets/LICENSES.md the same minute — ` +
  `\`node tools/freesound.mjs licenses <id...>\` prints them.`
);
process.exit(bad > 0 && cmd !== 'audition' ? 1 : 0);
