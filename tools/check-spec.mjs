#!/usr/bin/env node
/**
 * Spec-law checker — the laws CLAUDE.md says are CI-enforced, actually enforced.
 *
 * Written because of a real gap: CLAUDE.md states "Dossier cards REQUIRE
 * `status: documentary | contested | speculative`. Build fails without it." and
 * data/provotypes/_schema.json repeats the claim — but `npm test` never read
 * data/provotypes/ at all. A law that is documented as enforced and isn't is
 * worse than an unwritten one: it buys confidence nobody paid for.
 *
 * Four checks, each defending a law that is GREEN today (this locks the current
 * state, it does not ask for new work):
 *   C1 dossier/provotype schema — every source carries a status + confidence
 *   C2 felt-scene purity — no assistant offers a `felt` scene (tone laws)
 *   C3 tier/register vocabulary + the Quest budget of <=3 hero objects per scene
 *   C4 palette discipline — hex literals outside src/desktop/theme/, as a RATCHET
 *
 * C4 ratchets rather than fails outright: ~157 literals predate the law's
 * enforcement. Failing on all of them would get this file deleted by Friday.
 * It fails on growth and nags downward. See tools/check-invariants.mjs for the
 * two invariants that DO fail absolutely (network, storage).
 *
 * Failure text names the law, not just the field — Sérgio reads these.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => relative(ROOT, p);

const REGISTERS = ['operable', 'felt', 'respite'];
const TIERS = ['hero', 'set', 'fog'];
const STATUSES = ['documentary', 'contested', 'speculative'];
const MAX_HERO_PER_SCENE = 3; // CLAUDE.md: "<=3 hero objects per scene on Quest"

/**
 * Palette ratchet baseline: 6-digit hex literals in src/**.ts, excluding
 * src/desktop/theme/ (the sanctioned home of color) and src/debug/ (dev panel,
 * never speaks in the piece's voice). Lower this number when it drops; never
 * raise it without a note saying which law changed.
 */
const HEX_BASELINE = 51;

const errors = [];
const notes = [];

/** Comment convention in this project's data: _doc/_note/_state are prose, not data. */
const isDataKey = (k) => !k.startsWith('_');

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    errors.push(`${rel(file)}: not valid JSON — ${e.message.split('\n')[0]}`);
    return null;
  }
}

function walkJson(dir, onFile, skipDirs = []) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (skipDirs.includes(name)) continue; // superseded data must not fail a live build
      walkJson(p, onFile, skipDirs);
    } else if (name.endsWith('.json') && name !== '_schema.json') {
      // _schema.json carries every enum as literal data — it would validate itself
      const data = readJson(p);
      if (data) onFile(p, data);
    }
  }
}

// ── C1 + C2: provotypes (dossier status law, felt-scene purity) ──────────────
const REQUIRED = ['id', 'era', 'register', 'failure', 'cuts', 'invitation', 'frame', 'states', 'debrief', 'ledgerTags'];
let provotypeCount = 0;

walkJson(join(ROOT, 'data/provotypes'), (file, p) => {
  provotypeCount++;
  const where = rel(file);

  for (const key of REQUIRED) {
    if (!(key in p)) errors.push(`${where}: missing required field "${key}" (provotype schema)`);
  }

  if (p.register && !REGISTERS.includes(p.register)) {
    errors.push(`${where}: register "${p.register}" is not one of ${REGISTERS.join(' | ')} (register law)`);
  }

  // C1 — the dossier law CLAUDE.md promised the build would enforce
  const sources = p.debrief?.sources;
  if (!Array.isArray(sources)) {
    errors.push(`${where}: debrief.sources missing — every provotype debriefs at dossier grade`);
  } else {
    sources.forEach((s, i) => {
      const at = `${where}: debrief.sources[${i}]`;
      if (!STATUSES.includes(s?.status)) {
        errors.push(`${at} status "${s?.status ?? '(none)'}" — REQUIRED, one of ${STATUSES.join(' | ')}. ` +
          `Uncited claims carry [VERIFY SOURCE] until Sérgio checks them.`);
      }
      if (!s?.confidence) errors.push(`${at}: missing player-visible "confidence" label`);
      if (!s?.text) errors.push(`${at}: missing "text"`);
    });
  }

  // C2 — "The Assistant … never during `felt` scenes" (CLAUDE.md tone laws)
  if (p.register === 'felt' && p.invitation?.from) {
    errors.push(`${where}: register is "felt" but an assistant ("${p.invitation.from}") offers it. ` +
      `The assistant is never present in felt scenes — its absence IS the register change.`);
  }
});

// ── C3: register/tier vocabulary + hero budget, across room data ─────────────
let heroScenes = 0;

walkJson(join(ROOT, 'data/room'), (file, data) => {
  const where = rel(file);

  // Any node carrying facet-like children: validate vocabulary, then count heroes
  // among its immediate children (that node is "a scene" for budget purposes).
  (function visit(node, path) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;

    if (typeof node.register === 'string' && !REGISTERS.includes(node.register)) {
      errors.push(`${where}${path}: register "${node.register}" is not one of ${REGISTERS.join(' | ')} (register law)`);
    }
    if (typeof node.tier === 'string' && !TIERS.includes(node.tier)) {
      errors.push(`${where}${path}: tier "${node.tier}" is not one of ${TIERS.join(' | ')} (selective fidelity)`);
    }

    // hero budget: count children that are BOTH tier:hero AND carry an actual object
    const kids = Object.keys(node).filter(isDataKey).map((k) => [k, node[k]]);
    const heroes = kids.filter(([, v]) => v && typeof v === 'object' && v.tier === 'hero' && v.hero);
    if (heroes.length > 0) heroScenes++;
    if (heroes.length > MAX_HERO_PER_SCENE) {
      errors.push(`${where}${path}: ${heroes.length} hero objects (${heroes.map(([k]) => k).join(', ')}) — ` +
        `Quest budget allows <=${MAX_HERO_PER_SCENE} per scene.`);
    }

    for (const [k, v] of kids) visit(v, `${path}.${k}`);
  })(data, '');
}, ['_archive']);

// ── C4: palette ratchet ──────────────────────────────────────────────────────
let hexCount = 0;
const hexPerFile = new Map();

(function walkTs(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (p.includes(join('desktop', 'theme')) || name === 'debug') continue;
      walkTs(p);
    } else if (/\.ts$/.test(name)) {
      // {6,8} greedy so an #rrggbbaa literal matches whole and is not miscounted as 6-digit
      const hits = (readFileSync(p, 'utf8').match(/#[0-9A-Fa-f]{6,8}/g) ?? [])
        .filter((h) => h.length === 7);
      if (hits.length) {
        hexCount += hits.length;
        hexPerFile.set(rel(p), hits.length);
      }
    }
  }
})(join(ROOT, 'src'));

if (hexCount > HEX_BASELINE) {
  const worst = [...hexPerFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  errors.push(`palette: ${hexCount} hardcoded colors outside src/desktop/theme/, baseline is ${HEX_BASELINE}. ` +
    `Import era palettes from src/desktop/theme/ — never invent colors. ` +
    `Heaviest: ${worst.map(([f, n]) => `${f} (${n})`).join(', ')}`);
} else if (hexCount < HEX_BASELINE) {
  notes.push(`palette improved: ${hexCount} < baseline ${HEX_BASELINE} — tighten HEX_BASELINE to ${hexCount} in tools/check-spec.mjs`);
}

// ── report ───────────────────────────────────────────────────────────────────
if (errors.length) {
  console.error('spec-law check FAILED:');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
for (const n of notes) console.log('spec-law note: ' + n);
console.log(
  `spec OK: ${provotypeCount} provotypes carry dossier status + confidence; ` +
  `${heroScenes} scenes within the ${MAX_HERO_PER_SCENE}-hero budget; palette ${hexCount}/${HEX_BASELINE}`
);
