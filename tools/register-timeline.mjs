#!/usr/bin/env node
// Offline diagnostic only. Never import this module into the application.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUTPUT = 'docs/reinterp/REGISTER_TIMELINE_2026-11-03.md';
const SYMBOL = { operable: '·', felt: 'F', respite: 'R', ritual: '—', transition: '—' };
// Identity joins verified in src/witness/map.ts's condition registry. These
// join identities only; the register must still come from the source JSON.
const PROVOTYPE_BY_CONDITION = { formDone: 'origin_intake_e1', pillowDone: 'pillow' };

export function registerRecords(value, file, inheritedEra) {
  if (!value || typeof value !== 'object') return [];
  const era = typeof value.era === 'string' ? value.era.replace(/^era/, 'e') : inheritedEra;
  const records = [];
  if (typeof value.register === 'string') {
    records.push({ id: value.id, era, register: value.register, file });
  }
  for (const [key, child] of Object.entries(value)) {
    if (!key.startsWith('_')) records.push(...registerRecords(child, file, era));
  }
  return records;
}

export function timeline(map, records) {
  const used = new Set();
  const eras = map.eras.map(era => {
    const beats = era.beats.map((beat, i) => {
      const sourceId = PROVOTYPE_BY_CONDITION[beat.done];
      const candidates = records.filter(r =>
        (!r.era || r.era === era.id) && (
          r.id === `${era.id}.${beat.id}` ||
          (r.era === era.id && r.id === beat.id) ||
          (sourceId && r.id === sourceId)
        ));
      const registers = new Set(candidates.map(r => r.register));
      if (Object.hasOwn(beat, 'register')) registers.add(beat.register);
      const register = registers.size === 1 ? [...registers][0] : undefined;
      const symbol = SYMBOL[register] ?? '?';
      if (symbol !== '?') candidates.forEach(r => used.add(r));
      return { ...beat, index: i + 1, register, symbol,
        sources: candidates.map(r => r.file),
        reason: registers.size > 1 ? 'conflicting registers' :
          registers.size === 0 ? 'no structured register' : `unsupported register: ${register}` };
    });
    const counts = { operable: 0, felt: 0, respite: 0, transition: 0, unknown: 0 };
    let run = 0, longest = 0;
    for (const b of beats) {
      const key = b.symbol === '?' ? 'unknown' : b.symbol === '—' ? 'transition' : b.register;
      counts[key]++;
      run = b.register === 'operable' && b.symbol !== '?' ? run + 1 : 0;
      longest = Math.max(longest, run);
    }
    const person = counts.felt + counts.respite;
    return { ...era, beats, counts, longest,
      firstPerson: beats.find(b => b.symbol === 'F' || b.symbol === 'R')?.index,
      ratio: person ? `${counts.operable}:${person} (${(counts.operable / person).toFixed(2)})` : 'n/a (no annotated person beats)' };
  });
  return { eras, unjoined: records.filter(r => !used.has(r)) };
}

export function render(result, markdown = false) {
  if (markdown) return renderMarkdown(result);
  const lines = ['Register timeline — 2026-11-03', ''];
  lines.push('· operable | F felt | R respite | — ritual/transition | ? unknown',
    'Order: data/strings/map.json, all listed beats (including optional and full-cut beats).',
    'This is an authored map inventory, not a timed playthrough or a claim that every branch is visited.',
    'Quiet flags are reported separately; quiet is not a register. No prose annotations are interpreted.',
    'Indices are 1-based. Runs stop at ?; counts, first-person indices and ratios use known registers only.',
    'With unknown beats, longest runs are lower bounds and first-person indices may be incomplete.', '');
  for (const era of result.eras) {
    const c = era.counts;
    lines.push(`${era.id.toUpperCase()} · ${era.label} (${era.beats.length} beats)`,
      era.beats.map(b => b.symbol).join(' '),
      `Counts: operable ${c.operable}, felt ${c.felt}, respite ${c.respite}, ritual/transition ${c.transition}, unknown ${c.unknown}.`,
      `Longest known operable run: ${era.longest}; first F/R index: ${era.firstPerson ?? 'none annotated'}; operable:person = ${era.ratio}.`,
      `Quiet indices: ${era.beats.filter(b => b.quiet).map(b => b.index).join(', ') || 'none'}.`,
      `Optional indices: ${era.beats.filter(b => b.optional).map(b => b.index).join(', ') || 'none'}.`,
      `? beats: ${era.beats.filter(b => b.symbol === '?').map(b => `${b.index}:${b.id}`).join(', ') || 'none'}.`, '');
  }
  const known = result.eras.flatMap(e => e.beats.filter(b => b.symbol !== '?').map(b =>
    `${e.id}.${b.id} = ${b.register} (${b.sources.join(', ') || 'map.json'})`));
  const unknown = result.eras.flatMap(e => e.beats.filter(b => b.symbol === '?'));
  lines.push(`Unknown total: ${unknown.length}; ${unknown.filter(b => b.reason === 'conflicting registers').length} conflicts.`,
    `Resolved sources: ${known.join('; ') || 'none'}.`,
    'Identity joins: formDone → origin_intake_e1; pillowDone → pillow (src/witness/map.ts). Otherwise only exact era-qualified IDs or same-era IDs join.',
    'An update label or quiet flag alone does not supply a register; those beats remain ?.',
    'Registered source records not joined to map beats (not inserted into the timeline):',
    ...result.unjoined.map(r => `- ${r.file}: ${r.id ?? '(no id)'} / ${r.era ?? '(no era)'} / ${r.register}`), '');
  for (const era of result.eras) {
    for (const b of era.beats.filter(b => b.symbol === '?' && b.reason !== 'no structured register')) {
      lines.push(`- ${era.id}.${b.id}: ${b.reason}; sources: ${b.sources.join(', ') || 'map.json'}`);
    }
  }
  return lines.join('\n');
}

function renderMarkdown(result) {
  const lines = ['STATUS: live', '', '# Register timeline — 2026-11-03', '',
    '`·` operable · `F` felt · `R` respite · `—` ritual/transition · `?` unknown.', '',
    'Map order, all optional/full-cut beats included; not a timed playthrough. Counts are beats, not duration. Indices are 1-based. Quiet is reported separately, never inferred as a register.', '',
    '| Era | Timeline | O/F/R/—/? | Longest O | First F/R | O:person |',
    '|---|---|---|---:|---|---|'];
  for (const e of result.eras) {
    const c = e.counts;
    lines.push(`| ${e.id.toUpperCase()} · ${e.label} | \`${e.beats.map(b => b.symbol).join(' ')}\` | ${c.operable}/${c.felt}/${c.respite}/${c.transition}/${c.unknown} | ${e.longest} | ${e.firstPerson ?? 'none annotated'} | ${e.ratio} |`);
  }
  lines.push('', 'Unknowns break operable runs: run lengths are lower bounds; first F/R and ratios cover only annotated beats. “None annotated” does not mean no person beats exist.', '',
    '| Era | Quiet indices | ? beats (index:id) |', '|---|---|---|');
  for (const e of result.eras) {
    lines.push(`| ${e.id.toUpperCase()} | ${e.beats.filter(b => b.quiet).map(b => b.index).join(', ') || 'none'} | ${e.beats.filter(b => b.symbol === '?').map(b => `${b.index}:${b.id}`).join(', ') || 'none'} |`);
  }
  lines.push('', `**${result.eras.reduce((n, e) => n + e.counts.unknown, 0)} unknown beats.** No prose annotations or update labels supply registers. Source: data/strings/map.json plus structured register fields in data/provotypes/*.json and data/dialog/*.json (excluding underscore-prefixed schema/test files).`, '',
    'Resolved identity joins: e1.form → origin_intake_e1; e1.racket → pillow, both operable (provotype JSON; joins verified in src/witness/map.ts: formDone/pillowDone). Otherwise only exact era-qualified IDs or same-era IDs join. No register is assigned by this tool.', '',
    '**Registered records not joined** (not inserted into the timeline):', '');
  for (const r of result.unjoined) lines.push(`- ${r.file}: ${r.id ?? '(no id)'} / ${r.era ?? '(no era)'} / ${r.register}`);
  for (const e of result.eras) for (const b of e.beats.filter(b => b.symbol === '?' && b.reason !== 'no structured register')) {
    lines.push(`- ${e.id}.${b.id}: ${b.reason}; sources: ${b.sources.join(', ') || 'map.json'}`);
  }
  return lines.join('\n') + '\n';
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(a => a !== '--md')) throw new Error('Usage: node tools/register-timeline.mjs [--md]');
  const map = JSON.parse(await readFile(path.join(ROOT, 'data/strings/map.json'), 'utf8'));
  const records = [];
  for (const dir of ['data/provotypes', 'data/dialog']) {
    for (const name of (await readdir(path.join(ROOT, dir))).sort()) {
      if (!name.endsWith('.json') || name.startsWith('_')) continue;
      const file = `${dir}/${name}`;
      records.push(...registerRecords(JSON.parse(await readFile(path.join(ROOT, file), 'utf8')), file));
    }
  }
  const result = timeline(map, records);
  console.log(render(result));
  if (args.includes('--md')) {
    await writeFile(path.join(ROOT, OUTPUT), render(result, true));
    console.log(`Wrote ${OUTPUT}`);
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
