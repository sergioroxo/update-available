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
 * Six checks, each defending a law that is GREEN today (this locks the current
 * state, it does not ask for new work):
 *   C1 dossier/provotype schema — every source carries a status + confidence
 *   C2 felt-scene purity — no assistant offers a `felt` scene (tone laws)
 *   C3 tier/register vocabulary + the Quest budget of <=3 hero objects per scene
 *   C4 palette discipline — hex literals outside src/desktop/theme/, as a RATCHET
 *   C5 doc lifecycle tracking — STATUS headers, supersession links, opt-in KILLS
 *   C6 debug panel completeness — every debugJump id os.ts accepts has a panel
 *      button or a documented exclusion
 *
 * C4 ratchets rather than fails outright: ~157 literals predate the law's
 * enforcement. Failing on all of them would get this file deleted by Friday.
 * It fails on growth and nags downward. See tools/check-invariants.mjs for the
 * two invariants that DO fail absolutely (network, storage).
 *
 * C5 (added R29, D47/08_STATUS_REGISTER.md §5): the register's own diagnosis
 * was that a hand-maintained "what's current" page drifts silently — nothing
 * breaks when it goes stale, so nobody notices. The fix mirrors C4's ratchet
 * idiom rather than a one-shot pass: every docs/**.md carries a `STATUS:` line
 * as its first body line (`live` / `history-only` / `superseded-by <path>` /
 * honest `UNREVIEWED`); missing-or-UNREVIEWED count is ratcheted so the
 * migration can land incrementally and never silently regress; every
 * `superseded-by` target is checked to actually exist; and an opt-in `KILLS:
 * src/<path>#<symbol>` line lets a doc claim a symbol dead, failing CI if that
 * symbol is still referenced outside its own file — catching exactly the
 * "planned, partially done, assumed complete" gap the register was written for.
 *
 * C6 (added S50, docs/REINTERP_PLAYTHROUGH_NOTES_2026-07-25.md "ROOT CAUSE
 * FOUND"): the `?debug=1` panel is Sérgio's own map of the piece, and it had
 * silently drifted behind `src/desktop/os.ts`'s debugJump switch — the OS
 * accepted ids (all seven Caleb/S2R.3–S2R.6 beats) the panel never surfaced,
 * so a reviewer reasonably concluded content was missing when it wasn't. Like
 * C4/C5, this is a completeness check on a hand-maintained surface that
 * nothing else forces to stay current: it parses os.ts's debugJump switch for
 * every `case '...'` id (source of truth, not any notes doc) and parses
 * panel.ts's OS_BEATS/OS_BEAT_EXCLUSIONS for every id it declares reachable or
 * explicitly excluded, then fails if either side has an id the other doesn't
 * know about — a silent gap, or a stale exclusion, both fail loud instead.
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
const HEX_BASELINE = 42;

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

// ── C5: doc lifecycle tracking (STATUS headers, supersession, opt-in KILLS) ──
/**
 * Ratchet baseline: docs missing a STATUS header, or honestly left
 * UNREVIEWED, in docs/**.md. Frozen at adoption (S41, all 84 docs headered).
 * Lower this number when it drops; never raise it without a note saying
 * which doc regressed and why.
 */
const HEADERLESS_BASELINE = 0;

const STATUS_LINE = /^STATUS:\s*(live|history-only|UNREVIEWED|superseded-by\s+(\S+))\s*$/;
const KILLS_LINE = /^KILLS:\s*(src\/\S+?)#(\S+)\s*$/;

let headerlessCount = 0;
const supersededTargets = []; // { where, target }
const killsClaims = [];       // { where, path, symbol }

(function walkMd(dir) {
  for (const name of readdirSync(dir)) {
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
      headerlessCount++;
      continue;
    }
    const m = headerLine.trim().match(STATUS_LINE);
    if (m[1] === 'UNREVIEWED') {
      headerlessCount++; // honest, but still an open item — same ratchet as missing
    } else if (m[1].startsWith('superseded-by')) {
      supersededTargets.push({ where, target: m[2] });
    }
    for (const line of lines) {
      const km = line.trim().match(KILLS_LINE);
      if (km) killsClaims.push({ where, path: km[1], symbol: km[2] });
    }
  }
})(join(ROOT, 'docs'));

if (headerlessCount > HEADERLESS_BASELINE) {
  errors.push(`doc tracking: ${headerlessCount} docs/**.md missing a STATUS header (or left UNREVIEWED), ` +
    `baseline is ${HEADERLESS_BASELINE}. Add \`STATUS: live | history-only | superseded-by <path>\` as the ` +
    `first body line, per 08_STATUS_REGISTER.md §1 — or write UNREVIEWED honestly if the status is genuinely unknown.`);
} else if (headerlessCount < HEADERLESS_BASELINE) {
  notes.push(`doc tracking improved: ${headerlessCount} < baseline ${HEADERLESS_BASELINE} — ` +
    `tighten HEADERLESS_BASELINE to ${headerlessCount} in tools/check-spec.mjs`);
}

for (const { where, target } of supersededTargets) {
  if (!existsSync(join(ROOT, target))) {
    errors.push(`${where}: STATUS superseded-by "${target}" but that file does not exist on disk.`);
  }
}

for (const { where, path: killPath, symbol } of killsClaims) {
  const killAbs = join(ROOT, killPath);
  if (!existsSync(killAbs)) {
    errors.push(`${where}: KILLS ${killPath}#${symbol} but ${killPath} does not exist on disk.`);
    continue;
  }
  const referencedIn = [];
  (function walkSrcForSymbol(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        walkSrcForSymbol(p);
        continue;
      }
      if (!/\.ts$/.test(name)) continue;
      if (rel(p) === killPath) continue; // the declaring file may reference itself freely
      const content = readFileSync(p, 'utf8');
      if (new RegExp(`\\b${symbol}\\b`).test(content)) referencedIn.push(rel(p));
    }
  })(join(ROOT, 'src'));
  if (referencedIn.length) {
    errors.push(`${where}: KILLS ${killPath}#${symbol} but it is still referenced outside its own file: ` +
      `${referencedIn.join(', ')}. The doc claims this symbol is dead — it isn't.`);
  }
}

// ── C6: debug panel completeness (the review surface must not silently drift) ─
const OS_PATH = join(ROOT, 'src/desktop/os.ts');
const PANEL_PATH = join(ROOT, 'src/debug/panel.ts');
const osSrc = readFileSync(OS_PATH, 'utf8');
const panelSrc = readFileSync(PANEL_PATH, 'utf8');

/** every `case '<id>':` inside the debugJump(beat) method body only (brace-
 * matched, so other switches in the file — e.g. profile-icon ids — can't leak in). */
function debugJumpIds(src) {
  const marker = 'debugJump(beat: string): void {';
  const start = src.indexOf(marker);
  if (start === -1) throw new Error('C6: "debugJump(beat: string): void {" not found in os.ts — renamed/moved?');
  let depth = 0, end = -1;
  for (let i = start + marker.length - 1; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new Error('C6: could not find the end of debugJump(beat) — brace mismatch?');
  const body = src.slice(start, end);
  return new Set([...body.matchAll(/case '([^']+)':/g)].map((m) => m[1]));
}

/** every `id: '<id>'` panel.ts declares in its OS_BEATS rows. */
function panelBeatIds(src) {
  return new Set([...src.matchAll(/\bid:\s*'([^']+)'/g)].map((m) => m[1]));
}

/** every id listed in panel.ts's OS_BEAT_EXCLUSIONS array. */
function panelExclusionIds(src) {
  const start = src.indexOf('const OS_BEAT_EXCLUSIONS');
  if (start === -1) throw new Error('C6: OS_BEAT_EXCLUSIONS not found in panel.ts');
  const end = src.indexOf('];', start);
  if (end === -1) throw new Error('C6: OS_BEAT_EXCLUSIONS array is not closed with "];" in panel.ts');
  return new Set([...src.slice(start, end).matchAll(/'([^']+)'/g)].map((m) => m[1]));
}

const osIds = debugJumpIds(osSrc);
const panelIds = panelBeatIds(panelSrc);
const exclusionIds = panelExclusionIds(panelSrc);

const uncovered = [...osIds].filter((id) => !panelIds.has(id) && !exclusionIds.has(id));
if (uncovered.length) {
  errors.push(`debug panel: os.ts's debugJump accepts ${uncovered.join(', ')} with no panel button in ` +
    `src/debug/panel.ts and no entry in its OS_BEAT_EXCLUSIONS. The panel is Sérgio's map of the piece ` +
    `(docs/REINTERP_PLAYTHROUGH_NOTES_2026-07-25.md, "ROOT CAUSE FOUND") — a silent gap here reads as ` +
    `missing content when it isn't. Add a button, or add the id to OS_BEAT_EXCLUSIONS with a one-line reason.`);
}
const staleExclusions = [...exclusionIds].filter((id) => !osIds.has(id));
if (staleExclusions.length) {
  errors.push(`debug panel: src/debug/panel.ts's OS_BEAT_EXCLUSIONS lists ${staleExclusions.join(', ')}, ` +
    `which os.ts's debugJump no longer accepts — remove the stale exclusion.`);
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
  `${heroScenes} scenes within the ${MAX_HERO_PER_SCENE}-hero budget; palette ${hexCount}/${HEX_BASELINE}; ` +
  `docs headerless ${headerlessCount}/${HEADERLESS_BASELINE}, ${supersededTargets.length} supersession links, ` +
  `${killsClaims.length} KILLS assertion(s) all clear; ` +
  `debug panel covers all ${osIds.size} debugJump ids (${exclusionIds.size} excluded)`
);
