#!/usr/bin/env node
/**
 * Room-data integrity checker. The reinterp space is a fold of ordered deltas
 * (data/room/reinterp_deltas.json) over the base room (data/room/era1.json),
 * applied by src/room/clusterMorph.ts. A typo'd id in a `remove` or `props`
 * recolor, or a malformed `add`, silently produces a broken/empty room with no
 * error at runtime. This walks the same fold and fails the build on:
 *   - remove/props referencing an id that isn't live at that state
 *   - an add whose id is already live (double-add) or is malformed
 *   - a prop missing id / pos(3) / size(3) / #rrggbb color
 * Keeps the geometry honest so a bad edit is caught in CI, not in the headset.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const era1 = JSON.parse(readFileSync(join(ROOT, 'data/room/era1.json'), 'utf8'));
const deltas = JSON.parse(readFileSync(join(ROOT, 'data/room/reinterp_deltas.json'), 'utf8'));

const STATES = ['r1', 'r2', 'r3', 'r4']; // must match clusterMorph.SPACE_STATES
const errors = [];
const isHex = (c) => typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c);
const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every((n) => Number.isFinite(n));

function checkProp(p, where) {
  if (!p || typeof p.id !== 'string' || !p.id) errors.push(`${where}: prop missing id`);
  const id = p && p.id ? p.id : '?';
  if (!isVec3(p.pos)) errors.push(`${where}: ${id} pos must be 3 numbers`);
  if (!isVec3(p.size)) errors.push(`${where}: ${id} size must be 3 numbers`);
  if (!isHex(p.color)) errors.push(`${where}: ${id} color must be #rrggbb`);
}

// live prop-id set, seeded from the base room
const live = new Set();
for (const p of era1.props) {
  checkProp(p, 'era1.json');
  if (live.has(p.id)) errors.push(`era1.json: duplicate id ${p.id}`);
  live.add(p.id);
}

for (const s of STATES) {
  const d = deltas[s];
  if (!d) continue; // an empty/absent state folds as a no-op (allowed)
  for (const id of Object.keys(d.props ?? {})) {
    if (!live.has(id)) errors.push(`${s}.props: recolors "${id}" but it isn't in the room here`);
  }
  for (const id of d.remove ?? []) {
    if (!live.has(id)) errors.push(`${s}.remove: removes "${id}" but it isn't in the room here`);
  }
  for (const p of d.add ?? []) {
    checkProp(p, `${s}.add`);
    if (p && p.id && live.has(p.id)) errors.push(`${s}.add: "${p.id}" is already in the room (double-add)`);
  }
  // apply the fold so later states see the right live set
  for (const p of d.add ?? []) if (p && p.id) live.add(p.id);
  for (const id of d.remove ?? []) live.delete(id);
}

if (errors.length) {
  console.error('room-data check FAILED:');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`rooms OK: ${STATES.length} states fold cleanly over era1.json (${live.size} props live at E4)`);
