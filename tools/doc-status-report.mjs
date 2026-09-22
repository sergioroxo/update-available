#!/usr/bin/env node
/**
 * Read-only doc-status report — the generated view of 08_STATUS_REGISTER.md §1.
 * Lists every docs/**.md by its STATUS header (live / superseded-by / history-only
 * / UNREVIEWED / headerless). Never run by `npm test` — check-spec.mjs C5 is the
 * enforcement; this is the human-facing listing D47 asked for, so the register's
 * hand-written §1 table can shrink to exceptions over time instead of staying
 * the whole truth forever.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => relative(ROOT, p);

const STATUS_LINE = /^STATUS:\s*(live|history-only|UNREVIEWED|superseded-by\s+(\S+))\s*$/;

const byStatus = { live: [], 'history-only': [], UNREVIEWED: [], 'superseded-by': [], headerless: [] };

(function walkMd(dir) {
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith('.')) continue; // hidden dirs are other tools' scratch, not documentation
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      walkMd(p);
      continue;
    }
    if (!name.endsWith('.md')) continue;
    const where = rel(p);
    const lines = readFileSync(p, 'utf8').split('\n');
    const headerLine = lines.slice(0, 3).find((l) => STATUS_LINE.test(l.trim()));
    if (!headerLine) {
      byStatus.headerless.push(where);
      continue;
    }
    const m = headerLine.trim().match(STATUS_LINE);
    if (m[1] === 'UNREVIEWED') byStatus.UNREVIEWED.push(where);
    else if (m[1] === 'history-only') byStatus['history-only'].push(where);
    else if (m[1].startsWith('superseded-by')) byStatus['superseded-by'].push({ where, target: m[2] });
    else byStatus.live.push(where);
  }
})(join(ROOT, 'docs'));

const total = byStatus.live.length + byStatus['history-only'].length + byStatus.UNREVIEWED.length +
  byStatus['superseded-by'].length + byStatus.headerless.length;

console.log(`DOC STATUS REPORT — ${total} docs/**.md\n`);

console.log(`## live (${byStatus.live.length})`);
for (const w of byStatus.live) console.log(`  ${w}`);

console.log(`\n## superseded-by (${byStatus['superseded-by'].length})`);
for (const { where, target } of byStatus['superseded-by']) console.log(`  ${where} -> ${target}`);

console.log(`\n## history-only (${byStatus['history-only'].length})`);
for (const w of byStatus['history-only']) console.log(`  ${w}`);

console.log(`\n## UNREVIEWED (${byStatus.UNREVIEWED.length})`);
for (const w of byStatus.UNREVIEWED) console.log(`  ${w}`);

console.log(`\n## headerless (${byStatus.headerless.length}) — no STATUS line found in first 3 lines`);
for (const w of byStatus.headerless) console.log(`  ${w}`);
