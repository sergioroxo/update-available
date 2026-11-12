#!/usr/bin/env node
/**
 * S375 (UiB job 19 Part A) — builds out/s375/INDEX.md, index.json and sheets.json from everything the photography run made.
 *
 *     node tools/s375-index.mjs [out/s375]      then:   python3 tools/s375-sheets.py out/s375
 *
 * One entry per SURFACE (not per file). Sources: the sweep (tools/s375-photos.mjs, browser + headset), the tours
 * (tools/tour.mjs, tour-e4.mjs, browser + headset), tools/stills.mjs, the specialised stills tools, the static era sites,
 * and the walk's own frames (tools/flow-audit.mjs --flow-shots).
 *
 * HOW `reached` IS DECIDED (never by claim):
 *  - a SWEEP surface is a review route. It is marked `walk` only when most of the distinctive texts it drew (recorded by
 *    the flow sampler during the sweep) were also drawn at some point on the walk (the walk's samples.jsonl);
 *  - a TOUR frame was made by real presses; it is `walk` when every press since the previous frame is also a press the
 *    walk made (the walk's log), `tour` otherwise (real presses, but not the walk's own path);
 *  - everything else is `review-route`, except the walk's own frames, which are `walk` by definition.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2] || 'out/s375');
const abs = (...p) => path.join(ROOT, ...p);
const exists = (p) => fs.existsSync(p);
const readJson = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return d; } };
let skippedTour = 0;
const ERA_NAME = { 1: '1997', 2: '2003', 3: '2016', 4: '2026' };

// ───────────── the walk: what it pressed, what it drew ─────────────
const walkLog = exists(abs('walk-run.log')) ? fs.readFileSync(abs('walk-run.log'), 'utf8') : '';
const walkPresses = new Set();
for (const m of walkLog.matchAll(/^\s*\d+\s+(?:press|sweep-hit|inert)\s+(\S+)/gm)) walkPresses.add(m[1]);
const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const walkTexts = new Set();
const walkFrames = [];   // {t, era, ph, file, texts}
let walkSamples = [];
const samplesPath = abs('walk', 'samples.jsonl');
if (exists(samplesPath)) {
  const samples = [];
  for (const l of fs.readFileSync(samplesPath, 'utf8').split('\n')) {
    if (!l) continue; let o; try { o = JSON.parse(l); } catch { continue; }
    if (o.k !== 's') continue;
    const rec = { t: o.t, era: o.era, ph: o.ph }; samples.push(rec);
    if (o.c) { rec.c = {}; for (const [cid, c] of Object.entries(o.c)) { rec.c[cid] = { a: (c.w || 0) * (c.h || 0), t: (c.t || []).map((r) => norm(String(r[0]))) }; for (const r of c.t || []) walkTexts.add(norm(String(r[0]))); } }
  }
  const shotDir = abs('walk', 'shots');
  if (exists(shotDir)) {
    for (const f of fs.readdirSync(shotDir).filter((x) => x.endsWith('.jpg'))) {
      const t = Number(f.replace('.jpg', '')); let lo = 0, hi = samples.length - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (samples[m].t < t) lo = m + 1; else hi = m; }
      const s = samples[lo] || {};
      walkFrames.push({ t, era: s.era || '?', ph: s.ph || '?', file: path.join(shotDir, f) });
    }
    walkFrames.sort((a, b) => a.t - b.t);
  }
  walkSamples = samples;
  // the text on every large canvas at each frame's moment (replaying the sampler's changes), so frames group into screens
  {
    const cur = new Map(); let si = 0;
    for (const f of walkFrames) {
      while (si < samples.length && samples[si].t <= f.t) { if (samples[si].c) for (const [cid, c] of Object.entries(samples[si].c)) cur.set(cid, { ...c, ts: samples[si].t }); si++; }
      const all = new Set(); for (const c of cur.values()) if (c.a >= 40000 && c.ts >= f.t - 9000) for (const x of c.t) if (x.length >= 4 && /[a-z]{3}/.test(x)) all.add(x);
      f.texts = [...all];
    }
  }
}

// ───────────── the sweep ─────────────
const surfaces = new Map();   // id -> entry
const add = (e) => { const old = surfaces.get(e.id); surfaces.set(e.id, old ? { ...old, ...Object.fromEntries(Object.entries(e).filter(([, v]) => v != null && !(Array.isArray(v) && !v.length))) } : { extras: [], ...e }); return surfaces.get(e.id); };

// L's ten units and the offers (e4Place … e4PauseChips) were retired on 2026-09-10 (ERA4_STATE_2026-09-10.md: "L's ten units retired");
// their review routes still run but draw one frozen frame, so a photograph of each would be the same lie twenty times. Not indexed.
const RETIRED_ROUTES = ['place', 'l-intro', 'l-captions', 'l-unplaced', 'l-deadname', 'l-deadname2', 'l-shrink', 'l-shrink2', 'l-narrowed', 'l-returns', 'l-chips', 'offers', 'memory', 'memory-ab', 'memory2', 'wall', 'curation', 'pause', 'friction', 'pause-chips'].map((x) => 'e4-' + x);
const dropRetired = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => !RETIRED_ROUTES.includes(k)));
const sweepB = dropRetired(readJson(abs('browser', 'sweep', 'sweep.json'), {}));
const sweepX = Object.fromEntries(Object.entries(dropRetired(readJson(abs('xr', 'sweep', 'sweep.json'), {}))).filter(([k]) => !/^e\d-held-.*-(play|lit)$/.test(k)));   // the mock headset cannot grip a device: only the resting photograph is kept

/** the texts each sweep surface drew: replay the sampler's note markers */
function sweepTexts() {
  const out = {};
  const flowRoot = abs('browser', 'sweep', 'flow');
  const dirs = exists(flowRoot) ? fs.readdirSync(flowRoot).filter((d) => /^e\d/.test(d)).sort((a, b) => a.length - b.length || a.localeCompare(b)) : [];   // the full runs first, the partial re-runs after
  for (const d of dirs) {
    const p = path.join(flowRoot, d, 'samples.jsonl'); if (!exists(p)) continue;
    let windowTexts = new Map();   // canvas id -> Set of texts changed in this window
    const cur = new Map();         // canvas id -> texts now
    for (const l of fs.readFileSync(p, 'utf8').split('\n')) {
      if (!l) continue; let o; try { o = JSON.parse(l); } catch { continue; }
      if (o.k === 's' && o.c) for (const [cid, c] of Object.entries(o.c)) {
        if (c.w * c.h < 40000) continue;
        const set = new Set((c.t || []).map((r) => norm(String(r[0])))); cur.set(cid, set);
        if (!windowTexts.has(cid)) windowTexts.set(cid, new Set()); for (const x of set) windowTexts.get(cid).add(x);
      } else if (o.k === 'note' && o.kind === 'surface') {
        const all = new Set(); for (const s of windowTexts.values()) for (const x of s) all.add(x);
        out[o.target] = [...all]; windowTexts = new Map();
      }
    }
  }
  return out;
}
const texts = sweepTexts();
// chrome that every surface of an era draws (taskbar, "Start", the year) says nothing about which surface this is
const freq = new Map();
for (const t of Object.values(texts)) for (const x of new Set(t)) freq.set(x, (freq.get(x) || 0) + 1);
const nSurf = Math.max(1, Object.keys(texts).length);
const distinctive = (arr) => arr.filter((x) => x.length >= 5 && /[a-z]{3}/.test(x) && (freq.get(x) || 0) / nSurf < 0.25);

for (const [id, r] of Object.entries(sweepB)) {
  const dist = distinctive(texts[id] || []);
  const hit = dist.filter((x) => walkTexts.has(x)).length;
  let reached = 'review-route', note = '';
  if (r.retired) { reached = 'review-route'; note = 'retired from play'; }
  else if (!walkFrames.length) { reached = 'review-route'; note = 'no walk data'; }
  else if (dist.length >= 2 && hit / dist.length >= 0.6) { reached = 'walk'; note = `${hit}/${dist.length} of its texts drawn on the walk`; }
  else if (dist.length) { note = `${hit}/${dist.length} of its texts drawn on the walk`; }
  else { reached = 'review-route'; note = 'no distinctive text recorded (not matched)'; }
  add({ id, source: 'sweep', e: r.e, era: r.era, what: r.what, where: r.where, reached, reachedNote: note,
    browser: path.resolve(ROOT, 'browser', 'sweep', r.file), canvases: Object.fromEntries(Object.entries(r.canvases || {}).map(([k, f]) => [k, path.resolve(ROOT, 'browser', 'sweep', f)])),
    xr: sweepX[id] ? path.resolve(ROOT, 'xr', 'sweep', sweepX[id].file) : null });
}
for (const [id, r] of Object.entries(sweepX)) if (!surfaces.has(id)) add({ id, source: 'sweep', e: r.e, era: r.era, what: r.what, where: r.where, reached: 'review-route', reachedNote: 'headset pass only', xr: path.resolve(ROOT, 'xr', 'sweep', r.file) });

// ───────────── the tours ─────────────
function parseTour(logFile) {
  if (!exists(logFile)) return [];
  const rows = []; let presses = []; let warned = false;
  for (const l of fs.readFileSync(logFile, 'utf8').split('\n')) {
    let m;
    if (/^\s+⚠ .*never appeared|^\s+⚠ .*not pressable/.test(l)) warned = true;
    else if ((m = l.match(/^\s+press (\S+)/))) presses.push(m[1]);
    else if ((m = l.match(/^(\d\d-[\w-]+)\.png\s+(.*?)(?:\s+·\s+|$)/))) { rows.push({ file: m[1], name: m[1].replace(/^\d\d-/, ''), note: m[2].trim(), presses, unreliable: warned }); presses = []; warned = false; }
  }
  return rows;
}
for (const e of [1, 2, 3, 4]) {
  // the headset pass of 2003's tour stalled on its first press (the mock headset ignores the return press on the dark glass), so every
  // frame is the same dark screen: not indexed; 2003's headset photographs come from the sweep, which jumps there
  const b = parseTour(abs('browser', `tour-e${e}.log`)), x = e === 2 ? [] : parseTour(abs('xr', `tour-e${e}.log`));
  const xmap = new Map(x.map((r) => [r.name, r]));
  let prevWalk = true;
  for (const r of b) {
    const fileB = abs('browser', `tour-e${e}`, r.file + '.png');
    if (!exists(fileB)) continue;
    if (r.unreliable) { skippedTour++; continue; }   // a press for this frame never landed: its label would describe a screen the frame does not show
    const ownWalk = !r.presses.length ? prevWalk : r.presses.every((p) => walkPresses.has(p) || /^(ws\.|os\.)/.test(p) === false && walkPresses.has(p.replace(/^.*:/, '')));
    prevWalk = ownWalk;
    const xr = xmap.get(r.name); const fileX = xr ? abs('xr', `tour-e${e}`, xr.file + '.png') : null;
    add({ id: `tour${e}-${r.name}`, source: 'tour', e, era: ERA_NAME[e], what: r.note, where: 'a frame of the era played by real presses (tools/tour)',
      reached: !walkFrames.length ? 'tour' : ownWalk ? 'walk' : 'tour', reachedNote: ownWalk ? `its presses (${r.presses.join(', ') || 'none: a timed arrival'}) are also the walk's` : `real presses, not all on the walk: ${r.presses.join(', ')}`,
      browser: fileB, xr: fileX && exists(fileX) ? fileX : null });
  }
  for (const [name, r] of xmap) if (!b.find((q) => q.name === name)) { const f = abs('xr', `tour-e${e}`, r.file + '.png'); if (exists(f)) add({ id: `tour${e}-${name}`, source: 'tour', e, era: ERA_NAME[e], what: r.note, where: 'a frame of the era played by real presses (headset pass only)', reached: 'tour', xr: f }); }
}

// ───────────── tools/stills.mjs ─────────────
const stillsDir = abs('browser', 'stills'); const stillsSheet = readJson(path.join(stillsDir, 'STILLS.json'), {});
for (const [f, v] of Object.entries(stillsSheet)) {
  const p = path.join(stillsDir, f); if (!exists(p)) continue;
  const e = Number(f[1]); add({ id: `stills-${f.replace('.png', '')}`, source: 'stills', e, era: /^e4-(0[5-9]|10)/.test(f) ? 'close' : ERA_NAME[e], what: v.note, where: `a photographer's frame (tools/stills.mjs; camera ${v.cam})`, reached: 'review-route', reachedNote: 'a free-camera pose or a debug jump', browser: p });
}
for (const f of fs.existsSync(stillsDir) ? fs.readdirSync(stillsDir).filter((x) => /^e3-lead/.test(x)) : []) add({ id: `stills-${f.replace('.png', '')}`, source: 'stills', e: 3, era: '2016', what: f.replace(/\.png$/, '').replace(/-/g, ' '), where: 'the 2016 arrival (tools/stills.mjs)', reached: 'review-route', browser: path.join(stillsDir, f) });

// ───────────── the headset's room views (tools/xr-tour.mjs --hires) ─────────────
for (const e of [1, 2, 3, 4]) for (const v of ['front', 'desk', 'left', 'right', 'back']) {
  const f = abs('xr', 'xr-tour', `e${e}-${v}.png`); if (!exists(f)) continue;
  const id = `e${e}-room-${v}`; const s = surfaces.get(id);
  if (s) s.extras.push({ label: 'xr-tour --hires', path: f }); else add({ id, source: 'xr-tour', e, era: ERA_NAME[e], what: `The room from the seat, looking ${v}`, where: 'the player turns to look', reached: 'review-route', xr: f });
}

// ───────────── the specialised tools, one directory each ─────────────
const MISC = [
  ['entrance-played', 'out/s375/browser/entrance', 'entrance', 'The entrance as the walk plays it', 'the front door, the stars, the Lamblippy Setup, the opening film', 'walk'],
  ['setup', 'out/setup-lamblippy', 'entrance', 'Lamblippy Setup (the pre-story setup window)', 'the entrance: the first thing a player meets', 'walk'],
  ['setup-stars', 'out/setup-in-stars', 'entrance', 'The setup in the stars, the floating restore door', 'the entrance', 'walk'],
  ['entrance', 'out/s375/browser/entrance-polish', 'entrance', 'The entrance through both front doors', 'the entrance', 'walk'],
  ['leave', 'out/leave', 'leave', 'The Leave page and its hidden readings', 'the game menu\'s Leave row', 'review-route'],
  ['lexicon-home', 'out/asterisk-sources', 'home', 'LambyOS Home, the Lexicon card, Sources', 'the Home (return mode) and the Close', 'review-route'],
  ['home-xr', 'out/home-xr', 'home', 'LambyOS Home on the headset quad', 'the Home in the headset', 'review-route'],
  ['screensavers', 'out/more-screensavers', 'all', 'The screensavers', 'after idle', 'review-route'],
  ['viewer-harness', 'out/s375/browser/viewer-harness', 'site', 'The site viewer window (alone)', 'the in-world browser of the era sites', 'review-route'],
  ['viewer-app', 'out/s375/browser/viewer-app', 'site', 'The site viewer inside the piece + the mocked headset plane', 'opened from the menu / the Close', 'review-route'],
  ['e3-platform', 'out/codex-e3-mirror/platform', '2016', 'GracePlatform surfaces at their mirror width', 'the 2016 workstation', 'review-route'],
  ['support', 'out/support', 'all', 'The game menu Support page', 'Esc, Support', 'review-route'],
  ['game-matchmade', 'out/s375/browser/game-matchmade', '2026', 'MATCH MADE SIMPLE (tug of war) stills', 'the console in 2026', 'review-route'],
  ['sites', 'out/s375/browser/sites', 'site', 'The hub and the era websites', 'the Close\'s Sources buttons, the hub', 'review-route']
];
for (const [key, dir, era, what, where, reached] of MISC) {
  const d = path.resolve(dir); if (!exists(d)) continue;
  // the setup tools write a `-monitor` (the glass in the room) and a `-canvas` (the clean 2D art) of each state: one surface
  const groups = new Map();
  for (const f of fs.readdirSync(d).filter((x) => /\.png$/.test(x) && !/-300\.png$/.test(x)).sort()) {
    const m = f.match(/^(.*?)-(canvas|monitor)\.png$/); const base = m ? m[1] : f.replace(/\.png$/, '');
    if (!groups.has(base)) groups.set(base, { photo: null, canvas: null });
    const g = groups.get(base); if (m && m[2] === 'canvas') g.canvas = path.join(d, f); else g.photo = path.join(d, f);
  }
  const noteOf = new Map((readJson(path.join(d, path.basename(d) + '.json'), []) || []).filter((x) => x && x.file).map((x) => [x.file.replace(/\.png$/, ''), x.note]));
  for (const [base, g] of groups) {
    add({ id: `${key}-${base}`, source: key, e: 0, era, what: noteOf.get(base) ? `${what}: ${noteOf.get(base)}` : `${what}: ${base.replace(/[-_]/g, ' ')}`, where, reached, reachedNote: reached === 'walk' ? 'the walk presses through this' : 'a review tool; no claim a player reaches it', browser: g.photo || g.canvas, canvases: g.photo && g.canvas ? { canvas: g.canvas } : undefined });
  }
}

// ───────────── the screens the walk met (its frames, grouped by what was on the glass) ─────────────
{
  const J = (a, b) => { const A = new Set(a), B = new Set(b); let i = 0; for (const x of A) if (B.has(x)) i++; return i / Math.max(1, A.size + B.size - i); };
  let last = null, k = 0; const perEra = {};
  for (const f of walkFrames) {
    if (!f.texts || f.texts.length < 3) continue;
    if (last && J(last.texts, f.texts) >= 0.6) continue;
    last = f; k++;
    const e = Number((f.era || '').replace('e', '')) || 0;
    perEra[e] = (perEra[e] || 0) + 1;
    const top = [...f.texts].sort((a, b) => b.length - a.length).slice(0, 3).map((x) => x.length > 60 ? x.slice(0, 57) + '...' : x);
    add({ id: `walk-e${e}-${String(perEra[e]).padStart(3, '0')}`, source: 'walk', e, era: ERA_NAME[e] || 'all', what: `A screen the walk met (${f.ph}): "${top.join('" / "')}"`, where: 'on the played path (walk frame, 1280 x 900 JPEG)', reached: 'walk', reachedNote: `frame at +${((f.t - walkFrames[0].t) / 1000).toFixed(0)} s`, browser: f.file });
  }
}

// ───────────── the Close as played: flight, cards, panels, the Restart card (tools/close-order-probe.mjs, both modes) ─────────────
{
  const rep = readJson(abs('close-flow', 'report.json'), null);
  if (rep) {
    const byKey = new Map();
    for (const r of rep.results || []) {
      const ord = {};
      for (const row of r.rows || []) {
        const f = abs('close-flow', row.file); if (!exists(f)) continue;
        const st = row.stage ?? (row.monitor ? 'restart-card' : 'after');
        const card = row.note && /^card/.test(row.note) ? row.note.replace(/\s+/g, '-') : null;
        ord[st] = (ord[st] || 0) + 1;
        const key = card ? `${st}-${card}` : `${st}-${ord[st]}`;
        if (!byKey.has(key)) byKey.set(key, { stage: st, card, row });
        byKey.get(key)[r.mode === 'xr' ? 'xr' : 'browser'] = f;
      }
    }
    const names = { travel: 'the flight to Daniel\'s seat (with the glitch)', lookUp: 'the eyes rising to the stars', hold: 'the dusk hold before the messages', message: 'a message card (a press anywhere turns it)', open: 'the panels opening', settled: 'the settled sky', after: 'the sky after the panels', 'restart-card': 'the Restart card on Daniel\'s monitor' };
    let i = 0;
    for (const [key, v] of byKey) add({ id: `close-flow-${String(++i).padStart(2, '0')}-${key}`, source: 'close-flow', e: 4, era: 'close', what: `The Close: ${names[v.stage] || v.stage}${v.card ? ' (' + v.card.replace('-', ' ') + ')' : ''}`, where: 'the end of 2026, played by pressing each card (the walk plays the same stages)', reached: 'walk', reachedNote: 'the same stages as the walk\'s Close (card presses, then the Restart card); frames from tools/close-order-probe.mjs', browser: v.browser || null, xr: v.xr || null });
  }
}

// ───────────── the era changes (tools/era-change-probe.mjs, both modes) ─────────────
const changeDir = abs('era-change');
for (const e of [1, 2, 3]) {
  const frames = (m) => exists(changeDir) ? fs.readdirSync(changeDir).filter((f) => new RegExp(`^e${e}-${m}-(f|before)`).test(f)).sort().map((f) => path.join(changeDir, f)) : [];
  const d = frames('desktop'), x = frames('xr'); if (!d.length && !x.length) continue;
  const sd = path.join(changeDir, `sheet-e${e}-desktop.png`), sx = path.join(changeDir, `sheet-e${e}-xr.png`);
  add({ id: `era-change-${ERA_NAME[e]}-${ERA_NAME[e + 1]}`, source: 'era-change', e, era: 'change', what: `The era change ${ERA_NAME[e]} to ${ERA_NAME[e + 1]}: the ascent, the flyover, the glob morph, the landing`, where: 'the update restart that ends the era (the walk plays it)', reached: 'walk', reachedNote: 'fired through the real hooks (__os.onEraRelocate / onEraShift); the walk lives through the same hooks at each update',
    browser: exists(sd) ? sd : d[0], xr: exists(sx) ? sx : x[0], extras: [...d.filter((f, i) => i % 2 === 0).map((f) => ({ label: 'desktop frame', path: f })), ...x.filter((f, i) => i % 2 === 0).map((f) => ({ label: 'headset frame', path: f }))] });
}

// ───────────── the output ─────────────
const ERA_ORDER = ['entrance', '1997', '2003', '2016', '2026', 'change', 'close', 'home', 'site', 'leave', 'all'];
const all = [...surfaces.values()].sort((a, b) => ERA_ORDER.indexOf(a.era) - ERA_ORDER.indexOf(b.era) || a.id.localeCompare(b.id, undefined, { numeric: true }));
const json = { made: new Date().toISOString(), viewport: '2560 × 1440 browser; headset emulated (mono, tools/harness/xr-mock.mjs)', walk: { frames: walkFrames.length, presses: walkPresses.size, texts: walkTexts.size }, surfaces: all.map((s) => ({ id: s.id, era: s.era, what: s.what, where: s.where, reached: s.reached, reachedNote: s.reachedNote || '', source: s.source, browser: s.browser || null, xr: s.xr || null, canvases: s.canvases || {}, extras: s.extras || [] })) };
fs.writeFileSync(abs('index.json'), JSON.stringify(json, null, 1));

const counts = {}; for (const s of all) { counts[s.era] ||= { total: 0, walk: 0, review: 0, tour: 0, noXr: 0 }; const c = counts[s.era]; c.total++; if (s.reached === 'walk') c.walk++; else if (s.reached === 'tour') c.tour++; else c.review++; if (!s.xr) c.noXr++; }
const md = [];
md.push('STATUS: live', '', '# S375 photography index (UiB job 19 Part A)', '',
  `*Made ${json.made.slice(0, 16)} by tools/s375-*.mjs. Browser stills are 2560 × 1440 (drag-to-look camera); headset photos are the emulated headset (mono WebGL, 75° vertical field, a tracked head 1.2 m above the rig; no claim of stereo or headset timing). Nothing here is a score: the reviewer judges.*`, '',
  `Walk: ${walkFrames.length} frames (a screenshot every 3 s), ${walkPresses.size} distinct controls pressed, ${walkTexts.size} distinct text runs drawn.`, '',
  '**reached** is `walk` (the walk\'s own path drew it, by text or by press-match), `tour` (real presses by tools/tour*, not all on the walk\'s path) or `review-route` (a debug beat, a state set on the object or a free camera pose: no claim a player gets there).', '',
  '| era | surfaces | walk | tour | review-route | no headset photo |', '|---|---|---|---|---|---|',
  ...ERA_ORDER.filter((e) => counts[e]).map((e) => `| ${e} | ${counts[e].total} | ${counts[e].walk} | ${counts[e].tour} | ${counts[e].review} | ${counts[e].noXr} |`), '',
  'Thumbnail labels: [W] reached on the walk, [T] real presses by a tour, [R] review route. Contact sheets: `sheet-<era>.png` (browser), `sheet-<era>-xr.png` (headset), `sheet-walk.png`; paged copies `-p1.png`…', '');
md.push('## Notes and gaps (read before trusting a photograph)', '',
  '- **The walk** is `tools/flow-audit.mjs` (tools/walk.mjs, the default guided cut `?cut=speedrun`), real mouse presses from the front door to the Restart card; its frames are JPEG 1280 x 900, one every 3 s. The `walk-eN-NNN` surfaces are those frames grouped by what was drawn on the glass (a new surface when the drawn text changes by more than 40%).',
  '- **Sweep surfaces are review routes** (a debug beat or a state set on the live object). `reached: walk` on one means most of its distinctive texts were also drawn on the walk (matched against the walk\'s sampler); it is a text match, not a claim about the same moment.',
  '- **Headset photographs are the emulated headset** (mono, 75 degrees, a head 1.2 m above the rig; `tools/harness/xr-mock.mjs`): no hands, no stereo, no timing. The mock cannot grip a held device (handheld, flip phone, console): its headset photograph shows it AT REST where it is picked up from, and the browser photograph shows it held.',
  '- **Not photographed in the headset**: the entrance and Lamblippy Setup, the Leave page, the era websites, the Lexicon Home (tools/home-xr-check.mjs never reaches network idle on this build; tools/setup-stills.mjs, setup-stars-stills.mjs and check-entrance-polish.mjs time out on this build\'s entrance and keep only the frames they got to). The entrance is photographed in the browser by tools/s375-entrance.mjs (real presses).',
  '- **`review-route` is not "unreachable"**: the walk is the default short guided cut, so a surface marked `review-route` may still be reached by `?cut=full` or by an optional door the guided cut skips (the 2016 phone and FloppySheep states, 2003\'s NetVision and the boot crawl, the 1997 found files and screensavers, the 2026 stream beats, the held devices, the room views); this run did not walk those. Room views (front/left/back/right/desk) are always reachable by looking round and carry no text to match.',
  '- **Left out on purpose**: L\'s ten units and the offers (`e4Place` ... `e4PauseChips`, 20 review routes) were retired on 2026-09-10 (ERA4_STATE_2026-09-10.md) and their routes now draw one frozen frame; the headset pass of 2003\'s tour stalled on its first press (all frames the same dark screen); ' + skippedTour + ' frames of the browser tours whose press never landed (the 2026 tour is out of step with the current 2026 flow) because their labels would describe a screen the frame does not show. The files are still in the tour folders.',
  '- **Held in reserve**: 2016 has no held device (the phone is the Handset Window on the workstation); the 2016 platform surfaces are drawn by the workstation, so each has a clean canvas capture (`canvas:` in the table) beside the room photograph.', '');
for (const era of ERA_ORDER) {
  const list = all.filter((s) => s.era === era); if (!list.length) continue;
  md.push(`## ${era}`, '', '| id | what it is | where the player meets it | reached | browser photo | headset photo |', '|---|---|---|---|---|---|');
  for (const s of list) md.push(`| \`${s.id}\` | ${String(s.what).replace(/\|/g, '/')} | ${String(s.where).replace(/\|/g, '/')} | **${s.reached}**${s.reachedNote ? ' (' + String(s.reachedNote).replace(/\|/g, '/') + ')' : ''} | ${s.browser ? '`' + s.browser + '`' : '-'}${s.canvases && Object.keys(s.canvases).length ? '<br>canvas: ' + Object.entries(s.canvases).map(([k, v]) => `${k}: \`${v}\``).join(' · ') : ''} | ${s.xr ? '`' + s.xr + '`' : '-'} |`);
  md.push('');
}
md.push('## The walk\'s own frames', '', `${walkFrames.length} frames in \`${abs('walk', 'shots')}\` (JPEG, one every 3 s). Each distinct (era, phase) the walk sat in, with its first frame:`, '', '| era | phase | frames | first frame |', '|---|---|---|---|');
const byPhase = new Map(); for (const f of walkFrames) { const k = f.era + '|' + f.ph; if (!byPhase.has(k)) byPhase.set(k, { era: f.era, ph: f.ph, n: 0, first: f.file }); byPhase.get(k).n++; }
for (const p of byPhase.values()) md.push(`| ${p.era} | ${p.ph} | ${p.n} | \`${p.first}\` |`);
fs.writeFileSync(abs('INDEX.md'), md.join('\n') + '\n');

// ───────────── the sheets ─────────────
const sheets = {};
const sheetEra = { change: 'era-changes', entrance: 'entrance', 1997: '1997', 2003: '2003', 2016: '2016', 2026: '2026', close: 'close', home: 'home-and-sites', site: 'home-and-sites', leave: 'home-and-sites', all: 'home-and-sites' };
const SRC_RANK = { sweep: 0, 'xr-tour': 1, tour: 2, stills: 3, 'close-flow': 4, 'era-change': 5, walk: 9 };
const mark = { walk: 'W', tour: 'T', 'review-route': 'R' };
for (const s of [...all].sort((a, b) => (SRC_RANK[a.source] ?? 6) - (SRC_RANK[b.source] ?? 6))) {
  const nm = sheetEra[s.era]; if (!nm) continue;
  const label = `[${mark[s.reached] || '?'}] ${s.id}`;
  if (s.browser) (sheets[`sheet-${nm}`] ||= []).push({ label, path: s.browser });
  if (s.xr) (sheets[`sheet-${nm}-xr`] ||= []).push({ label, path: s.xr });
}
const seen = new Set(); sheets['sheet-walk'] = [...byPhase.values()].filter((p) => !seen.has(p.era + p.ph) && seen.add(p.era + p.ph)).map((p) => ({ label: `${p.era} ${p.ph} (${p.n})`, path: p.first }));
fs.writeFileSync(abs('sheets.json'), JSON.stringify(sheets));
console.log(`${all.length} surfaces`); for (const e of ERA_ORDER) if (counts[e]) console.log(e, JSON.stringify(counts[e]));
