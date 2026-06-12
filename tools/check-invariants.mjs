#!/usr/bin/env node
/**
 * CI invariant checker — the two promises that protect people, enforced:
 *   1. no runtime network calls
 *   2. no persistence of user input
 * Scans src/ for forbidden tokens. A line may carry `invariant-allow` with a
 * justification comment ONLY for non-runtime tooling code (reviewed by a
 * human). See CLAUDE.md "Hard invariants".
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');

const FORBIDDEN = [
  'fetch(',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'sendBeacon',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'document.cookie',
  'getUserMedia',
  'showOpenFilePicker'
];

const violations = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|js|mts|mjs)$/.test(name)) scan(p);
  }
}

function scan(file) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (line.includes('invariant-allow')) return;
    for (const token of FORBIDDEN) {
      if (line.includes(token)) {
        violations.push(`${file}:${i + 1} — forbidden "${token}"`);
      }
    }
  });
}

walk(SRC);

if (violations.length > 0) {
  console.error('INVARIANT VIOLATIONS (no-network / no-storage):');
  for (const v of violations) console.error('  ' + v);
  process.exit(1);
} else {
  console.log('invariants OK: no network, no storage tokens in src/');
}
