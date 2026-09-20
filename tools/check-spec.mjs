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
 * Nine checks, each defending a law that is GREEN today (this locks the
 * current state, it does not ask for new work):
 *   C1 dossier/provotype schema — every source carries a status + confidence
 *   C2 felt-scene purity — no assistant offers a `felt` scene (tone laws)
 *   C3 tier/register vocabulary + the Quest budget of <=3 hero objects per scene
 *   C4 palette discipline — hex literals outside src/desktop/theme/, as a RATCHET
 *   C5 doc lifecycle tracking — STATUS headers, supersession links, opt-in KILLS
 *   C6 debug panel completeness — every debugJump id os.ts accepts has a panel
 *      button or a documented exclusion
 *   C7 authoring-marker leak detector — player-visible strings in data/
 *      carrying a note-to-self, as a RATCHET (see below)
 *   C8 prompt-block lifecycle — no dispatchable session prompt sits inside a
 *      superseded doc, and every prompt block states SHIPPED/QUEUED/BLOCKED/DRAFT
 *   C9 content reachability — every data/**.json actually referenced from
 *      src/ (import or runtime load), not just mentioned inside a comment, as
 *      a RATCHET (see below)
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
 * C7 (added S58, docs/REINTERP_PLAYTHROUGH_E2_2026-07-26.md ROOT CAUSE #2):
 * `data/strings/slice.json`'s dossier card rendered `"NOTE: [researcher note —
 * Sérgio's voice, to write]"` straight to the player — a note-to-self, not
 * content, breaking the fiction and putting the author's name inside the
 * piece. Same lesson as C5/C6: a thing that CAN leak silently, will. C7 walks
 * every data/**.json file and recurses every string value, flagging any that
 * contains an authoring marker (`PLACEHOLDER`, `to write]`, `TODO`, `Sérgio`,
 * `[VERIFY SOURCE]`, `researcher note`, `FIXME`).
 *
 *   - Keys beginning `_` (`_doc`/`_note`/`_state`, this project's own
 *     authoring-comment convention, already `isDataKey`'s exclusion for C3)
 *     mark their whole subtree as authoring metadata and are exempt — that
 *     exemption is the entire distinction the check draws, so it reuses
 *     `isDataKey` rather than a second definition of the same rule. FILES
 *     whose own basename starts with `_` (`_schema.json`, `_dummy.json`,
 *     `_close_network.schema.json`) get the same exemption at the file level
 *     — they are schema/fixture data, never loaded into a played session.
 *   - The `to write` marker is checked as `to write]` — the exact shape of
 *     the known leak (an authoring aside closed with `]`) — because the bare
 *     phrase collides with ordinary UI copy already in the build (a diary
 *     hint reads "press ⏎ to write"); matching the closing bracket keeps the
 *     detector precise instead of chasing that false positive out of scope.
 *
 * C7 RATCHETS rather than failing outright, same idiom as C4/C5 and for the
 * same reason: a first real run turned up a dozen PRE-EXISTING hits this
 * session's file fence does not permit touching — `[VERIFY SOURCE]` inside
 * `data/provotypes/{pillow,origin_intake_e1}.json` debrief sources (C1's own
 * error text calls this an expected interim state: "Uncited claims carry
 * [VERIFY SOURCE] until Sérgio checks them"), `PLACEHOLDER` inside
 * `data/strings/{era3_devices,opening}.json`, and a `Sérgio`-signed authoring
 * note in `data/paths.json` (a beat/build-status ledger no runtime code ever
 * imports — narrative content, per CLAUDE.md, but not player-facing). Failing
 * outright here would break `npm test` over content this session cannot fix
 * (S59/S60/S61 territory) and would get the check reverted, not the content
 * fixed — exactly the outcome C4's own comment warns against. The baseline
 * below is frozen at this session's count (S58) after the ONE fix this
 * session DOES own (the slice.json leak) and the two false-positive
 * exemptions above; it fails on growth and nags downward, same as C4/C5.
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
const HEX_BASELINE = 24;

const errors = [];
let conductKeys = 0, conductProps = 0;
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
// ── C8 state: dispatchable session prompts (see the check below) ────────────
const promptBlocks = [];      // { where, line, tag, marked, superseded }
/** a session-prompt heading: `# S66 — …`. This project writes every build
 *  prompt under one, and agents are dispatched by copying the block beneath.
 *  ⚑ The dash is required, and it is what separates a SESSION from a SCENE:
 *  scene ids carry a dot (`## S1.7 — Escalation`, `S2R.3`) and must not trip
 *  this check — the first pass flagged three of them in the Era-1 ending
 *  scripts. So: digits, then whitespace, then a dash — never a dot. */
const PROMPT_HEADER = /^#{1,2}\s+(S\d{1,3})\s+[—–-]/;
/** the lifecycle marker a prompt heading must carry within 3 lines. */
const PROMPT_STATUS = /PROMPT STATUS:\s*(SHIPPED|QUEUED|BLOCKED|DRAFT)/;

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
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const km = line.trim().match(KILLS_LINE);
      if (km) killsClaims.push({ where, path: km[1], symbol: km[2] });
      // C8: a dispatchable session-prompt block. The header is what a human
      // greps for and copies; the fenced body under it is what gets pasted
      // into an agent. Both matter, so the header is the anchor.
      const pm = line.match(PROMPT_HEADER);
      if (pm) {
        const marked = lines.slice(i + 1, i + 4).some((l) => PROMPT_STATUS.test(l));
        promptBlocks.push({
          where, line: i + 1, tag: pm[1], marked,
          superseded: m[1].startsWith('superseded-by')
        });
      }
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

// ── C7: authoring-marker leak detector (RATCHET — see the file header) ───────
/**
 * Ratchet baseline: authoring-marker hits in player-visible data/**.json
 * strings. Frozen at adoption (S58) at the count that remained once this
 * session's own fix (slice.json's dossier note) and the two false-positive
 * exemptions (underscore-named schema/fixture files; `to write` scoped to
 * `to write]`) were applied. Lower this number when a hit gets fixed; never
 * raise it without a note saying which session introduced the regression.
 */
const AUTHORING_MARKER_BASELINE = 10;
const AUTHORING_MARKERS = [
  'PLACEHOLDER', 'to write]', 'TODO', 'Sérgio', '[VERIFY SOURCE]', 'researcher note', 'FIXME'
];
let stringsChecked = 0;
let leaksFound = 0;
const leakDetails = [];

/** recurses a parsed data/**.json value; `_`-prefixed keys (this project's
 *  authoring-comment convention, per `isDataKey`) exempt their whole subtree —
 *  that exemption is the entire distinction C7 draws. */
function checkAuthoringLeaks(where, node, path) {
  if (typeof node === 'string') {
    stringsChecked++;
    for (const marker of AUTHORING_MARKERS) {
      if (node.includes(marker)) {
        leaksFound++;
        const snippet = node.length > 80 ? node.slice(0, 80) + '…' : node;
        leakDetails.push(`${where}${path}: carries authoring marker "${marker}" — "${snippet}"`);
      }
    }
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => checkAuthoringLeaks(where, v, `${path}[${i}]`));
    return;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (!isDataKey(k)) continue; // "_"-prefixed: authoring metadata, exempt
      checkAuthoringLeaks(where, v, `${path}.${k}`);
    }
  }
}

(function walkDataForLeaks(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === '_archive') continue; // superseded data must not fail a live build
      walkDataForLeaks(p);
    } else if (name.endsWith('.json') && !name.startsWith('_')) {
      // "_"-prefixed FILES (e.g. _schema.json, _dummy.json,
      // _close_network.schema.json) are this project's own convention for
      // authoring/fixture data never loaded into a played session — the same
      // exemption "_"-prefixed KEYS get, just at the file level.
      const data = readJson(p);
      if (data) checkAuthoringLeaks(rel(p), data, '');
    }
  }
})(join(ROOT, 'data'));

if (leaksFound > AUTHORING_MARKER_BASELINE) {
  errors.push(`authoring-marker leak: ${leaksFound} player-visible data/**.json strings carry an authoring ` +
    `marker, baseline is ${AUTHORING_MARKER_BASELINE}. An authoring note-to-self reads as in-fiction text (C7; ` +
    `the same fault as the slice.json dossier note, docs/REINTERP_PLAYTHROUGH_E2_2026-07-26.md ROOT CAUSE #2). ` +
    `New hits:\n    ` + leakDetails.join('\n    '));
} else if (leaksFound < AUTHORING_MARKER_BASELINE) {
  notes.push(`authoring-marker leaks improved: ${leaksFound} < baseline ${AUTHORING_MARKER_BASELINE} — ` +
    `tighten AUTHORING_MARKER_BASELINE to ${leaksFound} in tools/check-spec.mjs`);
}

// ── C8: no dispatchable prompt inside a superseded doc; every prompt states ──
// ── its lifecycle. ROOT CAUSE, 2026-08-02: a session was dispatched with the
// ── "S66 — BUILD THE TESTIMONY STUDIO" block out of a doc whose own first line
// ── had read `STATUS: superseded-by …` since the day it was written. It logged
// ── BLOCKED and built nothing (423bd62), but only because that agent thought to
// ── check the header of the file its prompt came from — which is not a control.
// ── 08_STATUS_REGISTER.md §5 already named the class ("the pointers agents are
// ── told to trust were the stalest layer in the repo"); prompt blocks ARE that
// ── layer, and a doc's STATUS header does not propagate into the prompt a human
// ── copies out of it. So the prompt has to carry its own.
for (const b of promptBlocks) {
  if (b.superseded) {
    errors.push(`${b.where}:${b.line}: SUPERSEDED doc still contains a dispatchable prompt block ` +
      `(${b.tag}). Delete the prompt — an annotated prompt is still a prompt. Keep the reasoning, ` +
      `not the instructions (C8).`);
  } else if (!b.marked) {
    errors.push(`${b.where}:${b.line}: prompt block ${b.tag} carries no lifecycle marker. Add ` +
      `\`**⚑ PROMPT STATUS: SHIPPED|QUEUED|BLOCKED|DRAFT …**\` on one of the 3 lines under the ` +
      `heading, so a stale prompt cannot be dispatched by grepping for its number (C8).`);
  }
}

// ── C9: content reachability (RATCHET — see the file header) ─────────────────
/**
 * C9 (added S87, docs/reinterp/BUILD_QUEUE_LIVE.md "S87 — THE STRANDED
 * SURFACES"). Every check above verifies that content FILES EXIST (C1 counts
 * provotypes) or that rooms FOLD (check-rooms.mjs) — none of them verify a
 * player can ever RECEIVE the content. `data/provotypes/e4_ball.json` (6
 * sourced entries + a credit paragraph) and `data/provotypes/e4_offers.json`
 * (4 sourced entries) sat unimported for two sessions, each referenced
 * exactly once — inside a comment (the old `src/desktop/apps/ball.ts:49`,
 * `offers.ts:29`) — while every check in this file stayed green. Sérgio,
 * playing on the device this piece will be exhibited on, kept finding content
 * he could not reach and named the condition himself: "content that exists
 * and cannot be met."
 *
 * C9 walks data/**.json and asserts every file's basename appears somewhere
 * in src/**.ts with COMMENTS STRIPPED FIRST — stripping is the entire point
 * of the check: a filename inside a `/*` `*​/` block or a `//` line is exactly
 * how e4_ball.json and e4_offers.json hid from a plain grep. A basename match
 * against the stripped source, rather than a resolved import graph, is
 * deliberate: every import in this codebase is a relative literal ending in
 * the real filename (`import x from '../../data/provotypes/e4_ball.json'`),
 * so the basename is sufficient and the check needs no bundler/resolver. The
 * comment stripper is a plain regex, not a tokenizer — a `//` inside a string
 * literal earlier on the same line as a real import could in principle eat
 * that import too; no such case exists in this codebase today (imports sit on
 * their own lines), and this is named rather than hidden.
 *
 * SKIPPED, and exactly this list:
 *   - any file or directory whose name starts with `_` — this project's own
 *     fixture/schema/archive convention, already `isDataKey`'s exclusion
 *     above and C7's own file-level exemption: `_schema.json`, `_dummy.json`,
 *     `_close_network.schema.json`, and the `_archive` room-delta directory
 *     (`data/room/_archive/reinterp_deltas.radial-hexagon.json`);
 *   - `data/audio/tts_manifest.json` — a build-time manifest consumed by
 *     `tools/tts/render.py`, never by `src/`; the player-facing STRINGS it
 *     points at live in `data/dialog/**.json`, which this check does cover;
 *   - `data/paths.json` — a beat/build-status planning ledger, already
 *     documented in C7's own comment above as "narrative content, per
 *     CLAUDE.md, but not player-facing" and never imported by runtime code
 *     BY DESIGN — `src/narrative/spine.ts` hardcodes the beat sequence
 *     instead of reading it, a fact C7 already relies on for its own baseline.
 *
 * RATCHET BASELINE: 0, named rather than merely counted — after this
 * session's own item-1 fix (both e4 cards are now imported by
 * `src/desktop/gameMenu.ts`, which reads their `debrief` for two new Credits
 * sub-views), nothing in data/ is left unreferenced. Lowering from here is
 * not possible; never raise it without naming the new file and why it
 * genuinely cannot be reached yet (a stub with a TODO is still a reference).
 */
const UNREACHED_BASELINE = 0;
/** absolute paths, matched exactly — see the comment above for why each one
 *  is not player-facing content in the sense this check cares about. */
const UNREACHED_SKIP = new Set([
  join(ROOT, 'data/audio/tts_manifest.json'),
  join(ROOT, 'data/paths.json')
]);

let strippedSrcCache = null;
function strippedSrc() {
  if (strippedSrcCache !== null) return strippedSrcCache;
  const parts = [];
  (function walkTsForStrip(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) { walkTsForStrip(p); continue; }
      if (!/\.ts$/.test(name)) continue;
      // block comments, then line comments — same two-pass idiom as C7's own
      // reasoning about what a "comment" is in this codebase.
      const src = readFileSync(p, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      parts.push(src);
    }
  })(join(ROOT, 'src'));
  strippedSrcCache = parts.join('\n');
  return strippedSrcCache;
}

let unreachedCount = 0;
const unreachedDetails = [];
(function walkDataForReach(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name.startsWith('_')) continue; // fixture/schema/archive convention
      walkDataForReach(p);
      continue;
    }
    if (!name.endsWith('.json') || name.startsWith('_')) continue;
    if (UNREACHED_SKIP.has(p)) continue;
    if (!strippedSrc().includes(name)) {
      unreachedCount++;
      unreachedDetails.push(rel(p));
    }
  }
})(join(ROOT, 'data'));

if (unreachedCount > UNREACHED_BASELINE) {
  errors.push(`content reachability: ${unreachedCount} data/**.json file(s) never referenced from src/ outside ` +
    `a comment, baseline is ${UNREACHED_BASELINE} (C9). A file that exists but is never imported is content a ` +
    `player cannot reach — the exact fault e4_ball.json/e4_offers.json shipped with for two sessions. ` +
    `Unreached:\n    ` + unreachedDetails.join('\n    '));
} else if (unreachedCount < UNREACHED_BASELINE) {
  notes.push(`content reachability improved: ${unreachedCount} < baseline ${UNREACHED_BASELINE} — ` +
    `tighten UNREACHED_BASELINE to ${unreachedCount} in tools/check-spec.mjs`);
}


/**
 * ⚑ C10 · ASSET REACHABILITY — every media file the DATA names must exist on disk.
 *
 * Added 2026-08-21 after two independent audits ranked "the piece is nearly
 * silent where it was designed as sound" as the single biggest gap in the work
 * — and after a one-line script found **86 of 92 referenced audio files absent**.
 * Nobody knew the number because nothing had ever counted. C9 proved a data file
 * is referenced from code; this proves the file that data POINTS AT is really
 * there.
 *
 * ⚑ Why a ratchet and not a hard zero: most of the 86 are build-time TTS output
 * (the ball's MC lines, L's voice) from a pipeline that has not landed. Failing
 * the build on those would just get the check disabled, which is how a project
 * learns to ignore its own alarms. So it fails on GROWTH and nags downward — and
 * every file the pipeline delivers lowers the number automatically.
 */

/**
 * ⚑ C11 · CONDUCTING REACHABILITY — a hint that points at nothing.
 *
 * The guide's side-messages carry an `emphasis` key naming what the room should
 * light while that hint is up, and `app.ts`'s EMPHASIS_PROPS resolves it to prop
 * ids. Both halves can drift, silently, and both HAVE:
 *
 *   - Session 49 found `boombox` naming four props that no longer existed, so
 *     the guidance said "the player is on the shelf" and nothing on the shelf
 *     changed. The code comment recording that is still there.
 *   - Only two of eight side-messages ever carried an emphasis at all.
 *
 * ⚑ This is the project's signature failure — content that cannot be met —
 * wearing its smallest coat: the hint renders, the player reads it, and the room
 * does not answer. Nothing crashes and no test noticed for months.
 *
 * Checks both directions: every `emphasis` value in the guide data resolves to
 * an EMPHASIS_PROPS key, and every prop id that key names exists in the room.
 */
{
  const appSrc = readFileSync(join(ROOT, 'src/engine/app.ts'), 'utf8');
  const block = appSrc.match(/const EMPHASIS_PROPS[^=]*=\s*\{([\s\S]*?)\n  \};/);
  const keys = new Map();
  if (block) {
    for (const m of block[1].matchAll(/^\s*([a-zA-Z]+):\s*\[([^\]]*)\]/gm)) {
      keys.set(m[1], [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]));
    }
  }
  // every prop id the room can ever hold, across era1 + every delta `add`
  const roomIds = new Set();
  const collect = (n) => {
    if (Array.isArray(n)) n.forEach(collect);
    else if (n && typeof n === 'object') {
      if (typeof n.id === 'string') roomIds.add(n.id);
      Object.values(n).forEach(collect);
    }
  };
  collect(readJson(join(ROOT, 'data/room/era1.json')));
  collect(readJson(join(ROOT, 'data/room/reinterp_deltas.json')));

  for (const [key, ids] of keys) {
    for (const id of ids) {
      if (!roomIds.has(id)) errors.push(`conducting: EMPHASIS_PROPS.${key} names prop "${id}", which no room state contains — the hint would light nothing (C11).`);
    }
  }
  walkJson(join(ROOT, 'data/dialog'), (file, data) => {
    for (const msg of data.sideMessages ?? []) {
      if (msg.emphasis && !keys.has(msg.emphasis)) {
        errors.push(`conducting: ${relative(ROOT, file)} message "${msg.id}" has emphasis "${msg.emphasis}" with no EMPHASIS_PROPS entry — the room cannot answer this hint (C11).`);
      }
    }
  });
  conductKeys = keys.size;
  conductProps = [...keys.values()].reduce((a, b) => a + b.length, 0);
}

// ⚑ 48 → 1 (S102, 2026-09-02). The 47 were L's: Era 4's entire voice, named
// correctly in the data and rendered by nobody. They are on disk now, in one
// sitting, and REGISTERED (src/audio/tapeAudio.ts — a rendered file whose name
// is not in that registry is never requested, which looks exactly like silence).
// ⚑ 0 → 2 (S109), and this is NOT the thing the "never raise a baseline" law
// forbids. That law is about weakening a ratchet to make a failure go away. This
// is the opposite: the exemption above was NARROWED, from every `ball_*` name to
// the 38 voices alone, and the two files that had been sheltering under it —
// `ball_room_bed` and `ball_room_landing`, the ball's ROOM, not anybody's
// speech — became visible for the first time. Nothing got worse; a blind spot
// was removed and the number now tells the truth about what is missing.
//
// ⚑ The two are Sérgio's live decision (R1-1: a found through-the-wall recording,
// with a Suno take auditioned beside it), so they exist as a choice being made
// rather than as work nobody has started. **This baseline goes back to 0 the day
// that file lands** — it is the only number in this file that is expected to
// fall, and if it is still 2 in a month, the ball is still silent.
const AUDIO_BASELINE = 0;
let audioMissing = 0, audioRefs = 0;
{
  const refs = new Set();
  // walkJson hands us PARSED json, so scan every string value in the tree
  const scan = (n) => {
    if (typeof n === 'string') { if (/^[A-Za-z0-9_./-]+\.(mp3|wav|ogg)$/.test(n)) refs.add(n); }
    else if (Array.isArray(n)) n.forEach(scan);
    else if (n && typeof n === 'object') Object.values(n).forEach(scan);
  };
  // ⚑ The TTS manifest is a WORK QUEUE, not a set of promises the app relies
  // on: its `outFile` paths name files a human has not rendered YET, and that
  // is the point of the file. Counting them would make declaring work fail the
  // build, which would teach the next person to declare less — the opposite of
  // what this check is for. What IS counted is `data/dialog`'s own `audio`
  // names, because those are what the running piece tries to play.
  walkJson(join(ROOT, 'data'), (file, data) => {
    if (file.endsWith('tts_manifest.json')) return;
    scan(data);
  });
  // ⚑⚑ NAMES-ONLY AUDIO IS NOT MISSING AUDIO, AND CONFLATING THEM IS DANGEROUS.
  // s4_ball.json states the law: "NOT ONE LINE HERE IS VOICED, AND NONE OF THEM
  // MAY BE SYNTHESIZED… build-time TTS renders the APPARATUS and never a person;
  // the MC is a person and the room is people. So the `audio` names below are
  // names only." Those 38 `ball_*` entries are an ETHICAL REFUSAL that S79 made
  // deliberately and wrote down.
  //
  // ⚑ A ratchet that counted them would nag downward toward zero — i.e. it would
  // pressure a future session into synthesising the MC's voice to make a check
  // go green. A check that pushes someone to break the piece's own ethics law is
  // worse than no check. They are excluded by name, and the exclusion is the
  // point rather than an oversight.
  // ⚑ S109 — NARROWED FROM /^ball_/ TO THE 38 VOICES ALONE.
  //
  // The old rule exempted every name beginning `ball_`, and the refusal it was
  // protecting is specifically the MC's and the room's SPEECH: 38 lines that
  // must never be synthesized, written down as an ethical decision in
  // `s4_ball.json`'s `_docVoice`. But `ball_room_bed` and `ball_room_landing`
  // are not speech — they are the ROOM, a bed and a landing — and they were
  // sheltering under the same prefix. So the check could not see that the
  // piece's one respite had no sound at all, and `ball.ts` never played them
  // even in principle. Both facts survived three sessions inside one regex.
  //
  // ⚑ The exemption stays absolute for the voices. A check that nagged toward
  // rendering those would be pressuring a future session into breaking the
  // piece's own ethics, which is worse than no check. The room is different,
  // and now it is counted like any other missing asset.
  const NAMES_ONLY = /^ball_(?!room_)/;
  const bases = ['', 'public/', 'public/assets/audio/', 'data/audio/', 'assets/audio/'];
  const missing = [...refs].filter((r) => {
    if (NAMES_ONLY.test(r.split('/').pop())) return false;
    const leaf = r.split('/').pop();
    return !bases.some((b) => existsSync(join(ROOT, b.endsWith('audio/') ? b + leaf : b + r)));
  });
  if (missing.length > AUDIO_BASELINE) {
    errors.push(`asset reachability: ${missing.length} referenced media files do not exist, baseline is ${AUDIO_BASELINE}. ` +
      `New: ${missing.slice(0, 3).join(', ')}. Data must not point at files that are not there (C10).`);
  } else if (missing.length < AUDIO_BASELINE) {
    notes.push(`asset reachability improved: ${missing.length} < baseline ${AUDIO_BASELINE} — tighten AUDIO_BASELINE in tools/check-spec.mjs`);
  }
  audioMissing = missing.length; audioRefs = refs.size;
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
  `audio on disk ${audioRefs - audioMissing}/${audioRefs} (${audioMissing} missing, baseline ${AUDIO_BASELINE}); ` +
  `conducting ${conductKeys} emphasis key(s) → ${conductProps} props, all resolvable; ` +
  `debug panel covers all ${osIds.size} debugJump ids (${exclusionIds.size} excluded); ` +
  `authoring-marker leaks ${leaksFound}/${AUTHORING_MARKER_BASELINE} across ${stringsChecked} data/**.json strings; ` +
  `${promptBlocks.length} prompt block(s) all lifecycle-marked; ` +
  `content reachability: ${unreachedCount}/${UNREACHED_BASELINE} data/**.json files unreferenced from src/`
);
