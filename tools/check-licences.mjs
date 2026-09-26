#!/usr/bin/env node
/**
 * CHECK LICENCES — every file the build ships has a claim in a ledger.
 *
 *     node tools/check-licences.mjs            # part of `npm test`
 *     node tools/check-licences.mjs --list     # every shipped file and the ledger that claims it
 *
 * ⚑ WHY (S177 / R4-31). Sérgio, 2026-09-24: "plan for a check through all the project
 * files to check if there is anything unclaimed", and "even the free to use models
 * should have the credits". S175 found three CC-BY models (J-Toastie's) shipped for
 * weeks with no credit, because the only thing standing between a file and the build
 * was somebody remembering. This makes it a check, not a memory:
 *
 *   1. every file under public/ and assets/ (models, audio, images, the logo, the
 *      icons) is CLAIMED — its name appears in assets/LICENSES.md, in
 *      docs/reinterp/ATTRIBUTIONS.md, or (a trimmed sound) as an `out_name` in
 *      data/audio/ingest.tsv, whose ids are listed in ATTRIBUTIONS.md;
 *   2. every LICENSES.md row whose licence asks for attribution (CC-BY) or that is
 *      "credited by choice" names a source that ATTRIBUTIONS.md also carries;
 *   3. nothing is licensed NC (non-commercial) — a public, exhibited work is exactly
 *      where "non-commercial" gets argued about (his 2026-09-24 ruling on the CD).
 *
 * Generated files the project writes itself are exempt by name below, each with why.
 * A file with no claim FAILS: add its row (source, licence, who to credit) — never an
 * exemption, unless the project made it.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, basename, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const LIST = process.argv.includes('--list');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// what the project writes itself: generated from its own data, or its own config
const GENERATED = new Map([
  ['public/sources/index.html', 'tools/gen_sources_page.mjs — generated from the piece\'s own data'],
  ['public/manifest.webmanifest', 'the web-app manifest — project config, not an asset'],
  ['assets/LICENSES.md', 'the ledger itself'],
  ['assets/aseprite/README.md', 'a folder note'],
  ['public/assets/models/README.txt', 'a folder note'],
  ['assets/palettes/era1.gpl', 'the Era 1 palette — the project\'s own colour list (src/desktop/theme/era1.ts)']
]);

function walk(dir) {
  const out = [];
  if (!existsSync(join(ROOT, dir))) return out;
  for (const name of readdirSync(join(ROOT, dir))) {
    if (name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(join(ROOT, p)).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const licences = read('assets/LICENSES.md');
const attributions = read('docs/reinterp/ATTRIBUTIONS.md');
const ingest = read('data/audio/ingest.tsv').split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split('\t'));
const ingestNames = new Map(ingest.map(([id, out]) => [out, id]));

// a name is claimed if the ledger mentions it as a whole word: `x.glb`, `x.mp3`, or its stem
// a ledger row may claim a family by pattern: `l_*.mp3` (the TTS lines)
const globs = [...licences.matchAll(/`([^`\s]*\*[^`\s]*)`/g)].map((m) =>
  new RegExp('^' + m[1].replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$'));
const byGlob = (name) => globs.some((g) => g.test(name));
const mentions = (text, token) => new RegExp(`(^|[^A-Za-z0-9_])${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9_]|$)`).test(text);

/**
 * ⚑ THE ONE KNOWN DEBT, as a ratchet (the C4 idiom: fail on growth, nag downward).
 * The twelve Freesound sounds in use are all CC0 (verified against the API, 2026-09-02;
 * assets/LICENSES.md "Sérgio's Freesound pass"), and CC0 owes nothing legally — but his
 * rule of 2026-09-24 is that the free ones are credited too. Their uploaders' names come
 * from `node tools/freesound.mjs licenses <id…>` (the API, with his token), which this
 * session could not run. Each id leaves this list when its ATTRIBUTIONS.md row lands;
 * nothing may be added to it.
 */
const OWED = new Set([]);   // S177: emptied the same day — his `freesound.mjs licenses` run gave the twelve names
const owed = new Set();
const unclaimed = [];
const rows = [];
for (const f of [...walk('public'), ...walk('assets')].sort()) {
  const rel = relative(ROOT, join(ROOT, f));
  if (GENERATED.has(rel)) { rows.push([rel, `generated — ${GENERATED.get(rel)}`]); continue; }
  const name = basename(rel), stem = basename(rel, extname(rel));
  // a degraded / stripped master (`x_tape97.mp3`, `x_tape97_radio.mp3`) is claimed with its source row
  const root = stem.replace(/_tape97(_radio)?$/, '');
  let by = null;
  // a trimmed Freesound sound is claimed by its id, and its credit lives in ATTRIBUTIONS.md —
  // checked FIRST, so a pattern row (`l_*.mp3`, the TTS lines) cannot claim `l_arrives_2026`
  const id = ingestNames.get(stem) ?? ingestNames.get(root);
  if (id) {
    if (mentions(attributions, id)) by = `data/audio/ingest.tsv (#${id}, credited in ATTRIBUTIONS.md)`;
    else if (OWED.has(id)) { by = `OWED — Freesound #${id} (CC0) needs its credit row`; owed.add(id); }
    else unclaimed.push(`${rel} — ingest.tsv id ${id} has no ATTRIBUTIONS.md row`);
    rows.push([rel, by ?? 'UNCLAIMED']);
    continue;
  }
  // a bare stem only counts when it is distinctive (S177: `era1` matched the palette's row)
  const stemOk = (t) => t.length >= 8 || t.includes('_');
  if (mentions(licences, name) || (stemOk(stem) && mentions(licences, stem)) || (stemOk(root) && mentions(licences, root))) by = 'assets/LICENSES.md';
  else if (byGlob(name) || byGlob(`${stem}.mp3`)) by = 'assets/LICENSES.md (a pattern row)';
  else if (mentions(attributions, name) || mentions(attributions, stem)) by = 'docs/reinterp/ATTRIBUTIONS.md';
  rows.push([rel, by ?? 'UNCLAIMED']);
  if (!by) unclaimed.push(rel);
}

// 2 + 3 — the LICENSES.md table rows
const problems = [];
for (const line of licences.split('\n')) {
  if (!line.startsWith('|') || /^\|\s*-/.test(line) || /Model key/.test(line)) continue;
  const cells = line.split('|').map((c) => c.trim());
  const [, key, , source, licence = '', credit = ''] = cells;
  if (/\bNC\b|non-?commercial/i.test(licence)) problems.push(`${key}: licence "${licence}" is non-commercial — not allowed in the build`);
  const needs = /CC[- ]?BY(?!-?NC)/i.test(licence) || /credited by choice/i.test(credit);
  if (!needs) continue;
  // the source's quoted title ("Phone Stand") must appear in ATTRIBUTIONS.md
  const title = (source.match(/"([^"]+)"/) ?? [])[1];
  if (title && !attributions.includes(title)) problems.push(`${key}: "${title}" (${licence}) has no row in docs/reinterp/ATTRIBUTIONS.md`);
}

if (LIST) for (const [f, by] of rows) console.log(`${by === 'UNCLAIMED' ? '✗' : '✓'} ${f}  ←  ${by}`);
if (unclaimed.length || problems.length) {
  console.error(`licences FAILED — ${unclaimed.length} unclaimed file(s), ${problems.length} ledger problem(s):`);
  for (const u of unclaimed) console.error(`  unclaimed: ${u}`);
  for (const p of problems) console.error(`  ${p}`);
  console.error('  → add a row to assets/LICENSES.md (source, licence, credit) and, for CC-BY or credit-by-choice, to docs/reinterp/ATTRIBUTIONS.md');
  process.exit(1);
}
for (const id of OWED) if (!owed.has(id) && !mentions(attributions, id)) console.warn(`licences: OWED id ${id} is no longer shipped — remove it from the list`);
if (owed.size) console.warn(`licences: ${owed.size} Freesound sound(s) still owe their credit row (CC0; his rule): ${[...owed].map((i) => '#' + i).join(' ')} — node tools/freesound.mjs licenses ${[...owed].join(' ')}`);
console.log(`licences OK: ${rows.length} shipped files claimed (${rows.filter(([, b]) => b.startsWith('generated')).length} generated by the project); every attribution row present; nothing NC`);
