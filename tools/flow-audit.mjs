#!/usr/bin/env node
/**
 * FLOW AUDIT — nothing too fast, nothing on top, nothing out of order (UiB job 16 Part B, S369).
 *
 *     node tools/flow-audit.mjs --port 5291 --max 2600 --require-close          # walk with the sampler, then analyse
 *     node tools/flow-audit.mjs --analyse out/flow-audit/before-13f58c68        # analyse an existing samples file
 *       [--label before_13f58c68] [--report docs/reinterp/flow-audit/FLOW_AUDIT_<label>.md] [--time wall|piece]
 *     node tools/flow-audit.mjs --port 5291 --dir out/flow-audit/after --label after --flow-shots 6   # walk + report
 *
 * Any other argument is passed to tools/walk.mjs (--port, --max, --require-close, --cut, --from-era, --one-era…).
 * The walk runs with `--flow <dir>` (tools/harness/flow-sampler.mjs): a passive observer that samples every canvas's text
 * with its bounding boxes every 250 ms, the guide/phone hooks, and the walker's presses. It changes nothing the piece or
 * the walker does. This file only READS that data.
 *
 * ⚑ WHY (Sérgio, 11 Nov 2026, after playing the live build): "over crossing information and panel and timed prompts that
 * are too fast… the system blocking the message and then Ola sends the photo and stuff, like the flow is off here".
 * A person cannot count that by eye. The rule is UIB_JOB_16's:
 *
 *   1. NO TEXT LEAVES THE SCREEN BY ITSELF BEFORE A SLOW READER HAS READ IT. Need = 2 s + 0.4 s per word (capped at 10 s
 *      for a long card), or wait for a press. A press ends text legitimately, so "too fast" counts only where no walker
 *      press came in the ~1 s before the text vanished.
 *   2. NOTHING OPENS ON TOP OF SOMETHING BEING READ, and no window covers another's controls or content while both
 *      are live. Found as: a text run partly or fully covered by a LATER opaque draw in the same canvas frame (fillRect /
 *      filled rect path / clearRect / a picture or a child canvas blitted over it), or two visible texts overprinting.
 *   3. ONE VOICE AT A TIME. Three distinct surfaces getting new text within ~4 s, or a guide balloon up while another
 *      card / banner is new.
 *   (4. A CLOCK JUMP IS A VISIBLE PASSAGE OF TIME — reported too, as "clock".)
 *
 * WHAT A FINDING MEANS. "too fast" and "overlap" are only counted where the thing started or ended BY ITSELF (no press
 * within ~1 s); a person's own press is theirs. Text a walker's press ended is counted in the summary but not listed.
 * Findings that are BY DESIGN are matched against EXCEPTIONS below (each with the reason in its comment) and reported
 * in their own table, never as failures.
 *
 * LIMITS, stated plainly. It sees canvas text only (not DOM captions, not the pixel games' rect-drawn letters), and it
 * cannot tell whether a surface was in front of the head: it measures what a surface DREW, and a surface the player is
 * not facing still counts. The walker presses every ~2.2 s, so a text that ends within a second of a press is hidden from
 * "too fast" even when a slow reader would have wanted it longer. Durations are wall-clock by default; if the headless
 * renderer ran under ~12 fps the engine's dt clamp stretches time, and the report says so (use --time piece then).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };

// ───────────────────────────── the rule, in one place ─────────────────────────────
const NEED_BASE = 2, NEED_PER_WORD = 0.4, NEED_CAP = 10;
const need = (words) => Math.min(NEED_CAP, NEED_BASE + NEED_PER_WORD * words);
const PRESS_BEFORE = 1.0, PRESS_AFTER = 0.3;      // a press this close to a vanish / an onset owns it
const BLINK_GAP = 2.0;                             // the same words back in the same canvas within this: a blinking prompt, not a text that left
const FLICKER = 0.6;                               // gone sooner than this is a flicker, not a prompt
const COVER_PRESS_BEFORE = 1.5;                    // a window a press opened may take a beat to come up
const COVER_MIN = 0.15, COVER_HIDDEN = 0.95, COVER_PERSIST = 1.0;
const VOICE_WINDOW = 4.0, VOICE_MIN = 3;
const STREAM_GAP = 1.5, STREAM_MIN = 3;
const MIN_CANVAS_AREA = 40000;                     // 48×36 thumbnails and 72×72 photo sprites are not reading surfaces
const SETTLE_S = 6;                                // a canvas's first picture in the first seconds of the page is boot, not an arrival           // the job's "at least 1.5 s per line" for changelogs

// ───────────────────────────── what is by design ─────────────────────────────
/**
 * EXCEPTIONS — findings that are the design, matched here and reported in their own table.
 * Each has an id, the reason, and `test(f)`; f = { cat, era, ph, canvas:{n,w,h}, text, g (the hooks at that moment), … }.
 * Add one only with a reason from the docs, never to make a number green.
 */
const EXCEPTIONS = [
  {
    id: '2016-cascade',
    why: 'The 2016 cascade\'s speed is the point ("outnumbered", s3_maiden.json `cascade`, graceQueueLite CASCADE_STEP): the group\'s forwards land faster than review can answer, and the piece says so. Only the PHONE\'s group thread while stage is `takeover` is exempt — the board\'s PRIORITY ALERT cards, the Review rows and Orla\'s message are not.',
    test: (f) => f.era === 'e3' && f.g?.q?.stage === 'takeover' && isPhoneCanvas(f.canvas)
  },
  {
    id: '2026-clip',
    why: 'The 2026 clip ("The Great Becoming", Second Thoughts\' AI-made video) is timed to its music and narrator, and its cards are the beat (S360/S364, Sérgio 11 Nov: "the sound is fantastic, love the check marks and the intensity of each of the signs"). Its cards stay exactly as timed. Matched by the browser\'s clip takeover being live, or by the clip\'s own strings (data/dialog/s4_v3.json `clip`).',
    test: (f) => f.era === 'e4' && (f.g?.e4?.clip || textInSet(f.text, CLIP_TEXT))
  },
  {
    id: '2026-ball',
    why: 'The ball is deliberate stillness, about 3½ minutes with no controls, its lines timed to the audio (memory: stillness-is-not-a-dead-end; src/desktop/apps/ball.ts). Anything drawn while the ball is live is timed by the recording, not by a reader.',
    test: (f) => f.era === 'e4' && f.g?.e4?.ball
  }
];
function isPhoneCanvas(c) { return !!c && (c.n === 'phone' || (c.w === 360 && c.h >= 600)); }

// the clip's own words (for the clip exception), read from the data
let CLIP_TEXT = new Set();
try {
  const v = JSON.parse(readFileSync(join(ROOT, 'data/dialog/s4_v3.json'), 'utf8'));
  const walk = (o) => { if (typeof o === 'string') { for (const part of o.split(/\n/)) { const k = norm(part); if (k.length >= 4) CLIP_TEXT.add(k); } } else if (o && typeof o === 'object') for (const k in o) if (!k.startsWith('_doc')) walk(o[k]); };
  walk(v.clip);
} catch { /* the exception then matches by hook only */ }
function textInSet(text, set) {
  const lines = text.split(/ ⏎ /).map(norm);
  let hit = 0;
  for (const l of lines) { if (!l) continue; for (const s of set) if (s.includes(l) || l.includes(s)) { hit++; break; } }
  return lines.length > 0 && hit >= Math.ceil(lines.length / 2);
}

// ───────────────────────────── FLOW_PLAYTEST_2026-11-11 cross-check ─────────────────────────────
/** the known findings with a text anchor: the report says whether each is still seen (a regression guard, and the
 *  before/after proof). `any` = any category. */
const KNOWN = [   // era '*' = wherever it turns up (a changelog belongs to the era that is ending)
  ['F02', 'e3', /return the fa/i, ['overlap'], '2016: the Handset Window hides "Return the fa…" on the board'],
  ['F03', 'e3', /intervene immediately|discussing the malta vote|review starts now/i, ['too fast'], '2016: first PRIORITY ALERT leaves after ~4.5 s'],
  ['F04', 'e3', /intervening now/i, ['too fast', 'overlap'], '2016: "Intervening now" alert, too short, over the Review rows'],
  ['F05', 'e3', /missed you tonight|4 items could not be reviewed|→ 22:51/, ['overlap', 'voices', 'clock'], '2016: Orla\'s photo banner over the thread (and the clock jump)'],
  ['F06', 'e3', /important changes|your file stays with us|campaign kit · |2014 original · retained/i, ['overlap', 'voices', 'too fast'], '2016: the update window over the Handset Window, 1 s after Lambient'],
  ['F07', 'e2', /daniel says|caleb says|sit next to you|interaction classified|homosexual conduct/i, ['overlap'], '2003: the Accountability strip covers the newest messenger line'],
  ['F01', 'e3', /this week on graceplatform/i, ['overlap', 'voices'], '2016: a card opens over the "This week" card (and the Handset Window cuts its Close)'],
  ['F08', 'e3', /sunday\. it isn't you|keeping the corner|won't make sunday/i, ['too fast'], '2016: lock-screen notices change by themselves'],
  ['F09', 'e3', /i'm not saying|putting it in the/i, ['too fast'], '2016: the first Malta messages are replaced before they are read'],
  ['F10', 'e3', /→ 20:05|→ 21:41/, ['clock'], '2016: the evening\'s clock jumps (20:05 → 21:41 → 22:51)'],
  ['F12', '*', /graceos|restarting|the waiting: retired|kindredraft: archived/i, ['too fast', 'stream'], '2016→2026 changelog'],
  ['F13', '*', /nothing is ever removed|carried over, scanned|installing restorify/i, ['too fast', 'stream'], '1997→2003 changelog'],
  ['F14', '*', /questions are the same|a file was opened for you/i, ['too fast', 'stream'], '2003→2016 changelog'],
  ['F15', 'e1', /while you wait, browse|fellowship's pages/i, ['too fast', 'guide'], '1997: the guide\'s "while you wait, browse the fellowship\'s pages"'],
  ['F19', 'e4', /opening your things|happy birthday maya|who has the candles|priya: 18/i, ['too fast'], '2026: the opening and the birthday lines'],
  ['F20', 'e4', /your update has failed/i, ['too fast'], '2026: "Your update has failed." at the end'],
  ['F17', 'e4', /second thoughts is using your computer/i, ['too fast'], '2026: the "Second Thoughts is using your computer" bar comes and goes (job 15)'],
  ['F18', 'e4', /every door closed|number 4,815|keep them muted|muted junie/i, ['too fast', 'stream'], '2026: Maya\'s chat lines leave before they are read (job 15)'],
  ['F22', 'e4', /play something to help you relax/i, ['too fast', 'voices', 'stream'], '2026: the game offer and the takeover banner together (job 15)'],
  ['F21', 'e4', /every heart can be restored/i, ['too fast', 'flicker'], '2026: the GracePlatform Daily ticker alternating with Today']
];

// ───────────────────────────── helpers ─────────────────────────────
function norm(s) { return String(s).toLowerCase().replace(/\d+/g, '#').replace(/[…]/g, '...').replace(/\s+/g, ' ').replace(/\s*[\u2588\u258c\u258d\u258e\u258f\u2590_|]+$/, '').trim(); }
const LETTERS = /[a-zÀ-ɏ]/i;
const wordsOf = (s) => s.split(/\s+/).filter((w) => LETTERS.test(w)).length;
const CLOCK = /^(\d{1,2})[:.](\d{2})(?:\s?[ap]m)?$/i;
// a reading text has at least two words or five letters (a "Tue" or a "Mute" is a label, not something to read); not a clock
const isReading = (s) => { const n = (s.match(/[a-z\u00c0-\u024f]/gi) || []).length; return (wordsOf(s) >= 2 ? n >= 3 : n >= 5) && !CLOCK.test(s.trim()); };
const ERA_LABEL = { e1: '1997', e2: '2003', e3: '2016', e4: '2026' };
const eraName = (e) => ERA_LABEL[e] ? `${ERA_LABEL[e]}` : (e || 'pre-era');
const fmt = (t) => t.toFixed(1) + ' s';
const mmss = (t) => { const r = Math.round(t), m = Math.floor(r / 60), s = r % 60; return `${m}:${String(s).padStart(2, '0')}`; };
const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const clip = (s, n = 110) => { s = esc(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

// ───────────────────────────── run the walk (unless --analyse) ─────────────────────────────
const analyseDir = flag('analyse', '');
let DIR;
if (analyseDir) DIR = resolve(ROOT, analyseDir);
else {
  DIR = resolve(ROOT, flag('dir', 'out/flow-audit/run-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)));
  mkdirSync(DIR, { recursive: true });
  const own = new Set(['--analyse', '--dir', '--label', '--report', '--time']);
  const pass = [];
  for (let i = 0; i < argv.length; i++) { if (own.has(argv[i])) { i++; continue; } pass.push(argv[i]); }
  const rel = (p) => p.replace(ROOT + '/', '');
  const args = ['tools/walk.mjs', ...pass, '--flow', rel(DIR), '--out', rel(join(DIR, 'walk')), '--shots', rel(join(DIR, 'walk-shots'))];
  console.log('flow-audit: walking → ' + rel(DIR) + '\n  node ' + args.join(' '));
  const r = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit' });
  console.log('flow-audit: the walk exited ' + r.status + (r.status ? ' (analysing what was sampled anyway)' : ''));
  if (!existsSync(join(DIR, 'samples.jsonl'))) { console.error('no samples.jsonl — nothing to analyse'); process.exit(r.status || 1); }
  process.exitCode = r.status || 0;
}

// ───────────────────────────── load ─────────────────────────────
const TIME_MODE = flag('time', 'wall') === 'piece' ? 'piece' : 'wall';
const raw = readFileSync(join(DIR, 'samples.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const samples = raw.filter((r) => r.k === 's').sort((a, b) => a.t - b.t);
const pressRaw = raw.filter((r) => r.k === 'press').map((r) => r.t).sort((a, b) => a - b);
const notes = raw.filter((r) => r.k === 'note');
if (!samples.length) { console.error('no samples'); process.exit(1); }
const T0 = samples[0].t, PT0 = samples[0].pt;
const tOf = (s) => TIME_MODE === 'piece' ? s.pt - PT0 : (s.t - T0) / 1000;
/** a wall-clock press time, on the analysis clock */
const pressT = (ms) => {
  if (TIME_MODE === 'wall') return (ms - T0) / 1000;
  let lo = 0, hi = samples.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (samples[m].t < ms) lo = m + 1; else hi = m; }
  return samples[lo].pt - PT0;
};
const presses = pressRaw.map(pressT).sort((a, b) => a - b);
/** the nearest press inside [t - before, t + after], or null */
function pressNear(t, before = PRESS_BEFORE, after = PRESS_AFTER) {
  let lo = 0, hi = presses.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (presses[m] < t - before) lo = m + 1; else hi = m; }
  return lo < presses.length && presses[lo] <= t + after ? presses[lo] : null;
}
const END_T = tOf(samples[samples.length - 1]);

// per-sample era / phase / hooks, as time series
const eraAt = [], gAt = [];
{ let era = null, ph = null, g = {}; for (const s of samples) { if (s.era) era = s.era; if (s.ph) ph = s.ph; if (s.g) g = s.g; eraAt.push([tOf(s), era, ph]); gAt.push([tOf(s), g]); } }
function at(series, t) { let lo = 0, hi = series.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (series[m][0] <= t) lo = m; else hi = m - 1; } return series[lo]; }
const eraOf = (t) => at(eraAt, t)[1], phaseOf = (t) => at(eraAt, t)[2], gOf = (t) => at(gAt, t)[1];

// ───────────────────────────── rebuild the screens: presence, cover, overprint ─────────────────────────────
const canvasMeta = new Map();             // id -> {w,h,n}
const cur = new Map();                    // id -> lines now  [{s,key,b:[x0,y0,x1,y1],cov,via}]
const openItems = new Map();              // canvasId -> Map(key -> item)
const items = [];                         // every presence interval of a visible direct text line
const coverOpen = new Map(), covers = []; // text under a later draw
const overprintOpen = new Map(), overprints = [];
const clockLast = new Map(), clockJumps = [];
let firstEmit = true;

const boxUnion = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
const interArea = (a, b) => { const w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), h = Math.min(a[3], b[3]) - Math.max(a[1], b[1]); return w > 0 && h > 0 ? w * h : 0; };
const areaOf = (a) => Math.max(0, a[2] - a[0]) * Math.max(0, a[3] - a[1]);

for (const s of samples) {
  if (!s.c) continue;
  const t = tOf(s);
  for (const id of Object.keys(s.c)) {
    const c = s.c[id];
    if (c.w * c.h < MIN_CANVAS_AREA) continue;                 // thumbnails, icons, sprites: not reading surfaces
    const firstOfCanvas = !canvasMeta.has(id);
    canvasMeta.set(id, { w: c.w, h: c.h, n: c.n || canvasMeta.get(id)?.n });
    const lines = c.t.map(([text, x0, y0, x1, y1, cov, via]) => ({ s: text, key: norm(text), b: [x0, y0, x1, y1], cov, via }));
    cur.set(id, lines);
    // ── presence of visible, direct lines ──
    const open = openItems.get(id) || new Map(); openItems.set(id, open);
    const now = new Map();
    for (const l of lines) if (!l.via && l.key && !now.has(l.key)) now.set(l.key, l);   // hidden text is still there: covered, not gone
    for (const [key, it] of open) {
      if (now.has(key)) { it.last = t; it.bLast = now.get(key).b; }
      else { it.leave = t; it.canvasId = id; items.push(it); open.delete(key); }
    }
    for (const [key, l] of now) if (!open.has(key)) {
      open.set(key, { canvasId: id, key, text: l.s, first: t, last: t, initial: firstOfCanvas && t < SETTLE_S, b: l.b, bLast: l.b, era: eraOf(t), ph: phaseOf(t), leave: null });
    }
    // ── text under a later draw (cover) ──
    const cnow = new Map();
    for (const l of lines) if (l.cov >= COVER_MIN && l.key) { const k = l.key + '|' + l.via; const p = cnow.get(k); if (!p || l.cov > p.cov) cnow.set(k, l); }
    const co = coverOpen.get(id) || new Map(); coverOpen.set(id, co);
    for (const [k, v] of co) {
      if (cnow.has(k)) { const l = cnow.get(k); v.last = t; v.max = Math.max(v.max, l.cov); v.b = l.b; }
      else { v.end = t; covers.push(v); co.delete(k); }
    }
    for (const [k, l] of cnow) if (!co.has(k)) co.set(k, { canvasId: id, key: l.key, text: l.s, via: l.via, first: t, last: t, max: l.cov, b: l.b, era: eraOf(t), ph: phaseOf(t), end: null });
    // ── two visible texts overprinting (different strings) ──
    const vis = lines.filter((l) => l.cov < COVER_HIDDEN && l.key && isReading(l.s));
    const pnow = new Map();
    for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) {
      const a = vis[i], b = vis[j];
      if (a.key === b.key || a.key.includes(b.key) || b.key.includes(a.key)) continue;
      const ia = interArea(a.b, b.b); if (!ia) continue;
      if (ia < 0.4 * Math.min(areaOf(a.b), areaOf(b.b))) continue;
      pnow.set(a.key < b.key ? a.key + '\u0001' + b.key : b.key + '\u0001' + a.key, { a, b });
    }
    const po = overprintOpen.get(id) || new Map(); overprintOpen.set(id, po);
    for (const [k, v] of po) { if (pnow.has(k)) v.last = t; else { v.end = t; overprints.push(v); po.delete(k); } }
    for (const [k, { a, b }] of pnow) if (!po.has(k)) po.set(k, { canvasId: id, ta: a.s, tb: b.s, first: t, last: t, b: boxUnion(a.b, b.b), era: eraOf(t), ph: phaseOf(t), end: null });
    // ── clocks (rule 4) ──
    for (const l of lines) {
      const m = CLOCK.exec(l.s.trim()); if (!m || l.via) continue;
      const minutes = Number(m[1]) * 60 + Number(m[2]);
      const k = id + '|' + Math.round(l.b[1] / 12) + '|' + Math.round(l.b[0] / 40);
      const p = clockLast.get(k);
      if (p && p.minutes !== minutes && t - p.t <= 120) {
        const d = (minutes - p.minutes + 1440) % 1440;
        if (d >= 20 && d < 720) clockJumps.push({ canvasId: id, t, from: p.text, to: l.s.trim(), minutes: d, secs: t - p.t, b: l.b, era: eraOf(t), ph: phaseOf(t) });
      }
      if (!p || p.minutes !== minutes) clockLast.set(k, { minutes, t, text: l.s.trim() });
    }
  }
  firstEmit = false;
}
// close what is still open at the end (no leave: not judged)

// ───────────────────────────── blocks: lines that arrived together and read as one ─────────────────────────────
items.sort((a, b) => a.canvasId.localeCompare(b.canvasId) || a.first - b.first);
for (const open of openItems.values()) for (const it of open.values()) items.push(it);   // still open: arrival is known
const byCanvas = new Map();
for (const it of items) { (byCanvas.get(it.canvasId) || byCanvas.set(it.canvasId, []).get(it.canvasId)).push(it); }
const blocks = [];
for (const [id, arr] of byCanvas) {
  arr.sort((a, b) => a.first - b.first || a.b[1] - b.b[1]);
  // union-find across lines that arrived within 0.6 s of each other, vertically adjacent and aligned
  const parent = arr.map((_, i) => i);
  const f = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length && arr[j].first - arr[i].first <= 0.6; j++) {
    const a = arr[i], b = arr[j];
    const ha = a.b[3] - a.b[1], hb = b.b[3] - b.b[1];
    const gap = Math.max(a.b[1], b.b[1]) - Math.min(a.b[3], b.b[3]);
    const left = Math.abs(a.b[0] - b.b[0]) <= 12, mid = Math.abs((a.b[0] + a.b[2]) / 2 - (b.b[0] + b.b[2]) / 2) <= 12;
    const overlapY = Math.min(a.b[3], b.b[3]) - Math.max(a.b[1], b.b[1]);
    // wrapped lines sit one under another with a hair of air; successive STATES of one line (typing) sit on top of each other
    if (gap <= 0.35 * Math.min(ha, hb) && overlapY < 0.4 * Math.min(ha, hb) && (left || mid)) parent[f(i)] = f(j);
  }
  const groups = new Map();
  arr.forEach((it, i) => { const r = f(i); (groups.get(r) || groups.set(r, []).get(r)).push(it); });
  for (const g of groups.values()) {
    g.sort((a, b) => a.b[1] - b.b[1]);
    const text = g.map((x) => x.text).join(' ⏎ ');
    const words = Math.min(40, g.reduce((n, x) => n + wordsOf(x.text), 0));
    blocks.push({ canvasId: id, items: g, text, words, first: Math.min(...g.map((x) => x.first)), era: g[0].era, ph: g[0].ph, b: g.map((x) => x.b).reduce(boxUnion), initial: g.every((x) => x.initial) });
    for (const x of g) x.block = blocks[blocks.length - 1];
  }
}
blocks.sort((a, b) => a.first - b.first);

// ───────────────────────────── helpers over the data ─────────────────────────────
const meta = (id) => canvasMeta.get(id) || {};
const canvasOf = (id) => ({ id, n: meta(id).n, w: meta(id).w, h: meta(id).h });
const canvasStr = (c) => `${c.n ? c.n + ' ' : ''}${c.w}×${c.h}`;
const rectStr = (b) => `x ${b[0]}–${b[2]}, y ${b[1]}–${b[3]}`;
const allItemsByCanvas = byCanvas;
/** the same words are back in the same canvas within BLINK_GAP: a blinking prompt (reported in its own table, not as "left") */
function isBlink(it) {
  const arr = allItemsByCanvas.get(it.canvasId) || [];
  return arr.some((o) => o !== it && o.key === it.key && o.first >= it.leave && o.first - it.leave <= BLINK_GAP);
}
const blinks = new Map();
/** a text that is continuing (typed longer, re-wrapped, a counter ticking) rather than gone */
function continued(it) {
  const arr = allItemsByCanvas.get(it.canvasId) || [];
  const k = it.key;
  for (const o of arr) {
    if (o !== it && o.key === k && o.first >= it.leave && o.first - it.leave <= BLINK_GAP) return true;   // a blink: it is back
    if (o === it || Math.abs(o.first - it.leave) > 0.8 || o.key === k) continue;
    const a = o.key, b = k;
    if (a.startsWith(b) || b.startsWith(a)) return true;
    let n = 0; const m = Math.min(a.length, b.length); while (n < m && a[n] === b[n]) n++;
    if (n >= 8 && n >= 0.6 * m) return true;
    // same slot, same line, a few characters changed (a caret, a dot-dot-dot, a progress word)
    if (Math.abs(o.b[1] - it.b[1]) <= 3 && Math.abs(o.b[0] - it.b[0]) <= 6 && Math.abs(a.length - b.length) <= 3) return true;
  }
  return false;
}
/** a block whose every line is a longer / shorter / re-wrapped state of a line that just left: typing, not a new arrival */
function isContinuation(b) {
  const arr = allItemsByCanvas.get(b.canvasId) || [];
  return b.items.every((it) => arr.some((o) => o !== it && o.leave != null && Math.abs(o.leave - it.first) <= 0.8 && (it.key.startsWith(o.key) || o.key.startsWith(it.key))));
}
/** was a guide text drawn on any canvas while it was active? (presence intervals, direct lines) */
function seenOnCanvas(gi) {
  const end = gi.end ?? END_T, gt = norm(gi.txt).split(' ').filter((w) => w.length > 2);
  for (const it of items) {
    if (it.last < gi.start - 0.5 || it.first > end + 0.5) continue;
    const kk = norm(it.text).split(' ').filter((w) => w.length > 2);
    if (kk.length && kk.filter((w) => gt.includes(w)).length / kk.length >= 0.7) return true;
  }
  return false;
}
const guideTextNow = (t) => { const g = gOf(t); return [g.lg?.text, g.side].filter(Boolean).join(' '); };
function isGuideText(text, t) {
  const gt = norm(guideTextNow(t) + ' ' + guideTextNow(t + 1) + ' ' + guideTextNow(t - 1)); if (!gt.trim()) return false;
  const ws = norm(text).split(' ').filter((w) => w.length > 2);
  return ws.length > 0 && ws.filter((w) => gt.includes(w)).length / ws.length >= 0.7;
}

// ───────────────────────────── the findings ─────────────────────────────
const findings = [], exceptionHits = [], pressEnded = { 'too fast': 0, overlap: 0 }, tally = { measured: new Map() };
function add(f) {
  f.era = f.era || eraOf(f.t); f.ph = f.ph || phaseOf(f.t); f.g = gOf(f.t);
  f.canvas = f.canvas || canvasOf(f.canvasId);
  const ex = EXCEPTIONS.find((e) => { try { return e.test(f); } catch { return false; } });
  if (ex) { f.exception = ex.id; exceptionHits.push(f); } else findings.push(f);
}

// 1. too fast — by block (the lines of a block that arrived together are read together)
const tooFastRaw = [];
for (const it of items) {
  if (it.leave == null || it.initial) continue;
  const b = it.block;
  if (!isReading(it.text)) continue;
  const dwell = it.leave - it.first;
  const n = need(b.words);
  if (dwell >= n) continue;
  const key = tally.measured; key.set('lines', (key.get('lines') || 0) + 1);
  if (pressNear(it.leave)) { pressEnded['too fast']++; continue; }
  if (isBlink(it)) { const bk = it.canvasId + '|' + it.key; const bb = blinks.get(bk) || { text: it.text, canvasId: it.canvasId, n: 0, on: [], era: it.era, first: it.first, b: it.b }; bb.n++; bb.on.push(dwell); blinks.set(bk, bb); continue; }
  if (continued(it)) continue;
  tooFastRaw.push({ it, b, dwell, n });
}
{ // one finding per block per moment
  const seen = new Map();
  for (const r of tooFastRaw.sort((a, b) => a.it.leave - b.it.leave)) {
    const k = r.b.canvasId + '|' + r.b.first.toFixed(2) + '|' + Math.round(r.it.leave * 2);
    if (seen.has(k)) { const f = seen.get(k); f.members.push(r.it); f.dwell = Math.min(f.dwell, r.dwell); continue; }
    const f = { cat: r.dwell <= FLICKER ? 'flicker' : 'too fast', t: r.it.first, canvasId: r.b.canvasId, text: r.b.text, words: r.b.words, dwell: r.dwell, need: r.n, rect: r.b.b, members: [r.it], leaveT: r.it.leave };
    seen.set(k, f);
  }
  for (const f of seen.values()) { f.text = f.members.length && f.members.length < 1 ? f.text : f.text; add(f); }
}

// 2. overlap — a later draw over text. One finding per cover EVENT (a window or card opening over a region), not per line.
{
  const evs = new Map();
  for (const v of covers) {
    const end = v.end ?? END_T;
    if (end - v.first < COVER_PERSIST) continue;
    if (!isReading(v.text) || v.text.trim().length < 3) continue;
    if (pressNear(v.first, COVER_PRESS_BEFORE)) { pressEnded.overlap++; continue; }
    const k = v.canvasId + '|' + Math.round(v.first / 0.75);
    const e = evs.get(k) || { canvasId: v.canvasId, first: v.first, texts: new Map(), b: v.b, dur: 0, hiddenN: 0, partN: 0, maxCover: 0, via: false };
    if (!e.texts.has(v.key)) { e.texts.set(v.key, v); if (v.max >= COVER_HIDDEN) e.hiddenN++; else e.partN++; }
    e.b = boxUnion(e.b, v.b); e.dur = Math.max(e.dur, end - v.first); e.maxCover = Math.max(e.maxCover, v.max); e.via ||= !!v.via;
    evs.set(k, e);
  }
  for (const e of evs.values()) {
    const list = [...e.texts.values()].sort((a, b) => a.b[1] - b.b[1] || a.b[0] - b.b[0]);
    add({ cat: 'overlap', sub: `${list.length} text${list.length > 1 ? 's' : ''} under a later draw (${e.hiddenN} hidden, ${e.partN} cut)`, t: e.first, canvasId: e.canvasId, text: list.map((v) => v.text).join(' ⏎ '), rect: e.b, cover: e.maxCover, dur: e.dur, covered: list.length });
  }
}
for (const v of overprints) {
  const end = v.end ?? END_T;
  if (end - v.first < COVER_PERSIST) continue;
  if (pressNear(v.first)) { pressEnded.overlap++; continue; }
  add({ cat: 'overlap', sub: 'text on text', t: v.first, canvasId: v.canvasId, text: v.ta + ' ⏎ ' + v.tb, rect: v.b, dur: end - v.first });
}

// 3. voices at once: arrivals nobody pressed for
const events = [];
for (const b of blocks) {
  if (b.initial || !isReading(b.text) || (b.words < 2 && b.text.length < 8)) continue;
  if (pressNear(b.first, PRESS_BEFORE, PRESS_AFTER)) continue;
  if (isContinuation(b)) continue;     // a longer or re-wrapped version of text already there is the same voice, typing
  const cx = (b.b[0] + b.b[2]) / 2, cy = (b.b[1] + b.b[3]) / 2, m = meta(b.canvasId);
  const cell = m.w ? `${Math.min(2, Math.floor(3 * cx / m.w))}${Math.min(2, Math.floor(3 * cy / m.h))}` : '00';
  events.push({ t: b.first, canvasId: b.canvasId, cell, key: b.canvasId + ':' + cell, text: b.text, block: b });
}
events.sort((a, b) => a.t - b.t);
{
  // merge events of one canvas within 1 s: one window opening is one voice
  const merged = [];
  const firstKey = (e) => norm(e.text.split(' ⏎ ')[0]);
  // one voice: a window opening in one canvas (within 1 s), or the SAME words on two canvases (the phone's own screen and its mirror)
  for (const e of events) { const p = merged.find((q) => (q.canvasId === e.canvasId && Math.abs(q.t - e.t) <= 1.0) || (firstKey(q) === firstKey(e) && Math.abs(q.t - e.t) <= 1.5)); if (p) { p.text += ' ⏎ ' + e.text; p.parts.push(e); } else merged.push({ ...e, parts: [e] }); }
  let skipTo = -1;
  for (let i = 0; i < merged.length; i++) {
    if (merged[i].t < skipTo) continue;
    const win = merged.filter((e) => e.t >= merged[i].t && e.t <= merged[i].t + VOICE_WINDOW);
    const cells = new Set(win.map((e) => e.key));
    if (win.length >= VOICE_MIN && cells.size >= VOICE_MIN) {
      skipTo = win[win.length - 1].t + 0.01;
      add({ cat: 'voices', sub: win.length + ' new voices in ' + fmt(win[win.length - 1].t - win[0].t), t: win[0].t, canvasId: win[0].canvasId, text: win.map((e) => `[${canvasStr(canvasOf(e.canvasId))} @${(e.t - win[0].t).toFixed(1)}s] ${e.text.split(' ⏎ ')[0]}`).join('  //  '),
        rect: win[0].block.b, voices: win });
    }
  }
  // the guide balloon up while another card or banner is new
  const gI = []; let cur0 = null;
  for (const [t, g] of gAt) {
    const txt = [g.lg?.text, g.side].filter(Boolean).join(' ');
    if (txt && (!cur0 || cur0.txt !== txt)) { if (cur0) { cur0.end = t; gI.push(cur0); } cur0 = { start: t, txt, kind: g.lg ? 'lamby' : 'side', end: null }; }
    else if (!txt && cur0) { cur0.end = t; gI.push(cur0); cur0 = null; }
  }
  if (cur0) { cur0.end = END_T; gI.push(cur0); }
  // one finding per guide balloon: what else turned up while it was up (or in the 3 s before it came)
  for (const gi of gI) {
    // a side message nobody can see (1997 draws it only while the pointer rests on the helper tip) or one that outlives
    // every beat (a line parked for minutes) is not a balloon up in front of anyone
    if (gi.kind === 'side' && (!seenOnCanvas(gi) || (gi.end ?? END_T) - gi.start > 120)) continue;
    const others = merged.filter((e) => e.t >= gi.start - 3 && e.t <= gi.end && !isGuideText(e.text, e.t) && !isGuideText(e.text, gi.start));
    if (!others.length) continue;
    add({ cat: 'voices', sub: `a guide balloon is up while ${others.length} other new text${others.length > 1 ? 's turn' : ' turns'} up`, t: others[0].t, canvasId: others[0].canvasId,
      text: `guide (${gi.kind}, ${mmss(gi.start)}–${mmss(gi.end ?? END_T)}): "${gi.txt.slice(0, 90)}"  //  new: ` + others.slice(0, 4).map((e) => e.text.split(' ⏎ ')[0]).join(' | '), rect: others[0].block.b, guideStart: gi.start, guideEnd: gi.end });
  }
  globalThis.__guideIntervals = gI;
}

// 3b. streams: lines arriving faster than one every 1.5 s, unprompted
{
  const byC = new Map();
  for (const b of blocks) { if (b.initial || !isReading(b.text) || isContinuation(b)) continue; (byC.get(b.canvasId) || byC.set(b.canvasId, []).get(b.canvasId)).push(b); }
  for (const [id, bl] of byC) {
    bl.sort((a, b) => a.first - b.first);
    // distinct arrival instants in one column
    let chain = [];
    const flushChain = () => {
      if (chain.length >= STREAM_MIN) {
        const span = chain[chain.length - 1].first - chain[0].first;
        add({ cat: 'stream', sub: `${chain.length} lines, ${(span / (chain.length - 1)).toFixed(1)} s apart`, t: chain[0].first, canvasId: id, text: chain.map((c) => c.text.split(' ⏎ ')[0]).join('  //  '), rect: chain.map((c) => c.b).reduce(boxUnion), dwell: span / (chain.length - 1), need: STREAM_GAP });
      }
      chain = [];
    };
    for (const b of bl) {
      if (pressNear(b.first, 0, 0.6)) { flushChain(); continue; }
      const last = chain[chain.length - 1];
      if (last && b.first - last.first >= 0.2 && b.first - last.first < STREAM_GAP && (Math.abs(last.b[0] - b.b[0]) <= 30 || interArea([last.b[0], 0, last.b[2], 1], [b.b[0], 0, b.b[2], 1]) > 0)) chain.push(b);
      else if (last && b.first - last.first < 0.2) { /* the same instant: same voice */ }
      else { flushChain(); chain = [b]; }
    }
    flushChain();
  }
}

// 4. clocks
for (const c of clockJumps) {
  if (pressNear(c.t)) continue;
  add({ cat: 'clock', sub: `${c.from} → ${c.to} (${Math.round(c.minutes)} min in ${fmt(c.secs)})`, t: c.t, canvasId: c.canvasId, text: `${c.from} → ${c.to}`, rect: c.b });
}

// 5. a guide that is "active" but never drawn (F15: "I could not see the balloon in my frame")
const guideReport = [];
for (const gi of (globalThis.__guideIntervals || [])) {
  const end = gi.end ?? END_T, dur = end - gi.start;
  const seen = seenOnCanvas(gi);
  const words = wordsOf(gi.txt), n = need(words);
  const pressed = pressNear(end, 1.5, 0.3) != null;
  guideReport.push({ era: eraOf(gi.start), ph: phaseOf(gi.start), start: gi.start, end, dur, text: gi.txt, kind: gi.kind, seen, need: n, pressed });
  if (!seen && dur >= 1.5) add({ cat: 'guide', sub: 'a guide message was active but its text was never drawn on a canvas I can see', t: gi.start, canvasId: '0', text: gi.txt, canvas: { id: '-', n: 'hook', w: 0, h: 0 }, rect: [0, 0, 0, 0], dur });
  else if (dur < n && !pressed && dur >= 0) add({ cat: 'too fast', sub: 'guide balloon', t: gi.start, canvasId: '0', text: gi.txt, canvas: { id: '-', n: 'guide hook', w: 0, h: 0 }, rect: [0, 0, 0, 0], dwell: dur, need: n, words });
}

// ───────────────────────────── group repeats ─────────────────────────────
function group(list) {
  const m = new Map();
  for (const f of list) {
    const k = [f.era, f.cat, f.sub || '', norm(f.text).slice(0, 90)].join('|');
    const g = m.get(k) || { first: f, n: 0, times: [], min: Infinity, max: -Infinity };
    g.n++; g.times.push(f.t); if (f.dwell != null) { g.min = Math.min(g.min, f.dwell); g.max = Math.max(g.max, f.dwell); }
    m.set(k, g);
  }
  return [...m.values()].sort((a, b) => a.first.t - b.first.t);
}
const ERAS = ['e1', 'e2', 'e3', 'e4'];
const eraKey = (f) => f.era && ERA_LABEL[f.era] ? f.era : 'pre';
const CATS = ['too fast', 'overlap', 'voices', 'stream', 'clock', 'guide', 'flicker'];
const FAIL_CATS = ['too fast', 'overlap', 'voices'];
const count = (list, era, cat) => list.filter((f) => eraKey(f) === era && f.cat === cat).length;
const groups = (list, era, cat) => group(list.filter((f) => eraKey(f) === era && f.cat === cat));

// ───────────────────────────── the report ─────────────────────────────
const label = flag('label', DIR.split('/').pop());
const reportPath = resolve(ROOT, flag('report', 'docs/reinterp/flow-audit/FLOW_AUDIT_' + label + '.md'));
let sha = ''; try { sha = spawnSync('git', ['rev-parse', '--short=8', 'HEAD'], { cwd: ROOT }).stdout.toString().trim(); } catch { /* */ }
const fps = samples.map((s) => s.f).filter((x) => x > 0).sort((a, b) => a - b);
const medFps = fps.length ? fps[fps.length >> 1] : 0;
const lowFps = fps.length ? fps.filter((x) => x < 12).length / fps.length : 0;
const eraSpans = {};
for (const [t, era] of eraAt) { if (!era) continue; const e = (eraSpans[era] ||= { from: t, to: t }); e.to = t; }

const L = [];
L.push('STATUS: live', '');
L.push(`# Flow audit — ${label}`, '');
L.push(`*Generated by \`tools/flow-audit.mjs\` from \`${DIR.replace(ROOT + '/', '')}/samples.jsonl\` (sampler: \`tools/harness/flow-sampler.mjs\`). Build ${sha || '?'}. The rule is UIB_JOB_16: need = 2 s + 0.4 s per word (cap ${NEED_CAP} s); a press ends text legitimately; nothing opens on top of what is being read; one voice at a time.*`, '');
L.push('## How to read this', '',
  '- **too fast** — a text block that left the screen by itself (no press in the second before) before its need. Lines that arrived together are one block and read together. A text that grew longer (typing) or re-wrapped or is still elsewhere on the same canvas has not left.',
  '- **overlap** — *hidden* / *partly covered*: a text run under a LATER opaque draw in the same canvas frame (a window, card, banner, picture or child canvas blitted over it) that started by itself; *text on text*: two visible texts printing over each other.',
  '- **voices** — three or more distinct places (canvas + a 3×3 cell of it) getting new text within ~4 s, or a guide balloon up while something else is new. Only arrivals no press asked for.',
  '- **stream** — three or more lines arriving unprompted less than 1.5 s apart (the job\'s "at least 1.5 s per line" for changelogs).',
  '- **guide** — the guide hook (`__guide()` side message, or Lamby\'s balloon) said a line was active but its text was never drawn on any canvas while it was active. In 1997 the side message is drawn only while the pointer rests on the helper tip (src/desktop/os.ts `guideTipAt`), so an unprompted side message is invisible; Lamby\'s balloon is the visible one.',
  '- **clock** — a clock text that jumps 20 min or more inside two minutes (rule 4).',
  '- **flicker** — a text that was on screen for 0.6 s or less and left by itself (a blink, a glitch frame): listed so a blinking prompt is not invisible.',
  '- Times are seconds from the start of the sampled walk, ' + (TIME_MODE === 'piece' ? '**piece time** (frame deltas clamped at 0.1 s, as the engine does)' : '**wall-clock**') + '. A "canvas" is an offscreen 2D surface; rects are in that canvas\'s own pixels (the OS desktop is 512×384, Room 2\'s workstation 676×390 plus a draw scale, the handset 180×360 at 2×).',
  '- **Not in a failure count:** the by-design EXCEPTIONS (their own table, with the reason), and anything a walker press ended. The tool sees canvas text only, not DOM captions or the pixel games\' rect letters, and it cannot know which surface the player is facing.', '');

L.push('## The run', '');
L.push(`- ${samples.length} samples over ${mmss(END_T)} (${END_T.toFixed(0)} s), ${presses.length} walker presses, ${notes.length} walker log lines, ${canvasMeta.size} canvases seen.`);
L.push(`- Frame rate while sampled: median ${medFps.toFixed(0)} fps, ${(lowFps * 100).toFixed(1)} % of samples under 12 fps` + (lowFps > 0.1 || medFps < 12 ? ' — ⚑ **low: the engine clamps dt at 0.1 s, so the piece\'s own clock runs slower than the wall clock; re-analyse with `--time piece`.**' : ' (the piece\'s clock and the wall clock agree).'));
L.push(`- Eras as the walker tracked them (\`os.desktopEra\`): ` + (ERAS.filter((e) => eraSpans[e]).map((e) => `**${ERA_LABEL[e]}** ${mmss(eraSpans[e].from)}–${mmss(eraSpans[e].to)}`).join(', ') || 'none'));
L.push(`- ${items.length} text lines were seen arriving and ${blocks.length} blocks; ${tally.measured.get('lines') || 0} lines left earlier than their need, of which a press ended ${pressEnded['too fast']} (not counted); ${pressEnded.overlap} covered/overprinted texts began right after a press (not counted).`, '');

// summary table
L.push('## Summary', '', '| era | too fast | overlap | voices | stream | clock | guide | flicker | by design (exceptions) |', '|---|---|---|---|---|---|---|---|---|');
const eraRows = [...ERAS, 'pre'];
for (const e of eraRows) {
  const label2 = e === 'pre' ? 'before the first era (entrance / setup)' : ERA_LABEL[e];
  const row = CATS.map((c) => groups(findings, e, c).length + (count(findings, e, c) !== groups(findings, e, c).length ? ` (${count(findings, e, c)}×)` : ''));
  const ex = exceptionHits.filter((f) => eraKey(f) === e).length;
  L.push(`| ${label2} | ${row.join(' | ')} | ${ex} |`);
}
const tot = (c) => group(findings.filter((f) => f.cat === c)).length;
L.push(`| **all** | ${CATS.map((c) => `**${tot(c)}**`).join(' | ')} | **${exceptionHits.length}** |`, '');
L.push('*Cells are distinct findings (repeats of the same text grouped); a "(n×)" is how many times they happened.*', '');
L.push(`**Done = zero "too fast" and zero "overlap" outside the by-design exceptions.** This run: **${tot('too fast')} too fast, ${tot('overlap')} overlap**, ${tot('voices')} voices, ${tot('stream')} streams.`, '');

// cross-check
L.push('## FLOW_PLAYTEST_2026-11-11 cross-check', '', 'Each known finding with a text anchor, and whether this run still sees it (any category listed, exceptions included).', '', '| id | era | seen now? | where | what |', '|---|---|---|---|---|');
const allF = [...findings, ...exceptionHits];
for (const [id, era, rx, cats, what] of KNOWN) {
  const hit = allF.filter((f) => (era === '*' || f.era === era) && cats.includes(f.cat) && rx.test(f.text));
  const itemHit = hit.length ? null : items.filter((it) => rx.test(it.text) && (era === '*' || it.era === era)).length;
  L.push(`| ${id} | ${era === '*' ? 'any' : ERA_LABEL[era]} | ${hit.length ? '**yes** ×' + hit.length : 'no' + (itemHit ? ' (the text was on screen, no finding)' : ' (the text was never seen)')} | ${hit.length ? hit.slice(0, 2).map((f) => `${f.cat} @${mmss(f.t)}`).join(', ') : ''} | ${esc(what)} |`);
}
L.push('');

// per era
const SECTION_NOTE = {
  e1: 'The careful pass: the 1997 text census was too noisy to read; this reads draw lists, so it can say what was on screen and for how long.',
  e2: 'The careful pass: as 1997.'
};
for (const e of eraRows) {
  const lab = e === 'pre' ? 'Before the first era (entrance, setup in the stars, opening film)' : `${ERA_LABEL[e]}`;
  const span = eraSpans[e];
  L.push(`## ${lab}` + (span ? ` — ${mmss(span.from)}–${mmss(span.to)} (${mmss(span.to - span.from)})` : ''), '');
  if (SECTION_NOTE[e]) L.push(SECTION_NOTE[e], '');
  const inEra = (f) => eraKey(f) === e;
  const bl = blocks.filter((b) => (b.era && ERA_LABEL[b.era] ? b.era : 'pre') === e);
  const timed = bl.filter((b) => !b.initial && b.items.every((i) => i.leave != null) && isReading(b.text));
  const selfEnded = timed.filter((b) => !pressNear(Math.min(...b.items.map((i) => i.leave))) && !b.items.every((i) => isBlink(i) || continued(i)));
  const tooShort = selfEnded.filter((b) => Math.min(...b.items.map((i) => i.leave)) - b.first < need(b.words));
  L.push(`${bl.length} text blocks arrived; ${timed.length} of them also left; ${selfEnded.length} left with no press in the second before (timed by the piece); ${tooShort.length} of those left before their need.`, '');
  let any = false;
  for (const cat of CATS) {
    const gs = groups(findings, e, cat);
    if (!gs.length) continue;
    any = true;
    L.push(`### ${cat}` + (cat === 'too fast' ? ' (measured vs need = 2 s + 0.4 s/word)' : ''), '');
    L.push('| time | what | measured | need | canvas · rect | ×/times |', '|---|---|---|---|---|---|');
    for (const g of gs.slice(0, 60)) {
      const f = g.first;
      const meas = f.cat === 'overlap' ? (f.sub + `, for ${fmt(f.dur)}`) : f.cat === 'too fast' || f.cat === 'flicker' || f.cat === 'stream' ? `${g.min === Infinity ? '' : fmt(g.min) + (g.max !== g.min ? '–' + fmt(g.max) : '')}${f.sub && f.cat !== 'too fast' ? ' · ' + f.sub : ''}` : f.sub || '';
      const nd = f.need != null ? fmt(f.need) + (f.words ? ` (${f.words} w)` : '') : '';
      L.push(`| ${mmss(f.t)} (${f.t.toFixed(0)} s) · ${f.ph || ''} | ${clip(f.text, 160)} | ${meas} | ${nd} | ${canvasStr(f.canvas)} · ${rectStr(f.rect)} | ${g.n > 1 ? g.n + '× at ' + g.times.slice(0, 6).map((x) => x.toFixed(0)).join(', ') + (g.n > 6 ? '…' : '') : ''} |`);
    }
    if (gs.length > 60) L.push(`| … | ${gs.length - 60} more (all in findings.json) | | | | |`);
    L.push('');
  }
  if (!any) L.push('*No findings outside the by-design exceptions.*', '');
  const ex = group(exceptionHits.filter(inEra));
  if (ex.length) {
    L.push('### by design (exceptions)', '', '| time | exception | what | measured |', '|---|---|---|---|');
    for (const g of ex.slice(0, 25)) L.push(`| ${mmss(g.first.t)} | ${g.first.exception} | ${f2(g.first)} | ${g.first.cat}${g.n > 1 ? ' ×' + g.n : ''}${g.first.dwell != null ? ', ' + fmt(g.first.dwell) + ' vs ' + fmt(g.first.need ?? 0) : ''} |`);
    if (ex.length > 25) L.push(`| … | | ${ex.length - 25} more | |`);
    L.push('');
  }
  // the careful pass for 1997 and 2003: every self-timed text block and every guide balloon
  if (e === 'e1' || e === 'e2') {
    const gr = guideReport.filter((g) => g.era === e);
    L.push(`### Guide / Lamby balloons in ${ERA_LABEL[e]}`, '');
    if (gr.length) {
      L.push('| time | kind | text | up for | need | visible on a canvas? | ended by |', '|---|---|---|---|---|---|---|');
      for (const g of gr.slice(0, 40)) L.push(`| ${mmss(g.start)} | ${g.kind} | ${clip(g.text, 120)} | ${fmt(g.dur)} | ${fmt(g.need)} | ${g.seen ? 'yes' : '**no**'} | ${g.pressed ? 'a press' : 'itself'} |`);
      L.push('');
    } else L.push('*No guide message was active.*', '');
    L.push(`### Timed texts in ${ERA_LABEL[e]} (blocks that left by themselves; shortest relative to need first)`, '');
    const rows = selfEnded.map((b) => { const lv = Math.min(...b.items.map((i) => i.leave)); return { b, dwell: lv - b.first, n: need(b.words) }; }).sort((x, y) => x.dwell / x.n - y.dwell / y.n);
    L.push('| time | text | on screen | need | ok? | canvas |', '|---|---|---|---|---|---|');
    for (const r of rows.slice(0, 45)) L.push(`| ${mmss(r.b.first)} | ${clip(r.b.text, 120)} | ${fmt(r.dwell)} | ${fmt(r.n)} | ${r.dwell >= r.n ? 'yes' : '**too fast**'}${continuedMark(r.b)} | ${canvasStr(canvasOf(r.b.canvasId))} |`);
    if (rows.length > 45) L.push(`| … | ${rows.length - 45} more timed blocks, all within need or better | | | | |`);
    L.push('');
  }
}
function f2(f) { return clip(f.text, 130); }
function continuedMark(b) { return b.items.some((i) => continued(i)) ? ' (continues elsewhere)' : ''; }

if (blinks.size) {
  L.push('## Blinking prompts (information, not counted)', '', 'The same words went off and came back in the same canvas within 2 s, again and again: a blink, not a text that left. Whether a blink is wanted is a design call; the canvas matters (a prompt on a surface nobody faces costs nothing).', '', '| era | text | blinks | on for | canvas · rect |', '|---|---|---|---|---|');
  for (const b of [...blinks.values()].sort((x, y) => y.n - x.n).slice(0, 15)) { const on = b.on.slice().sort((x, y) => x - y); L.push(`| ${eraName(b.era)} | ${clip(b.text, 80)} | ${b.n}× | ~${fmt(on[on.length >> 1])} | ${canvasStr(canvasOf(b.canvasId))} · ${rectStr(b.b)} |`); }
  L.push('');
}
L.push('## Exceptions in force', '', 'Named in `tools/flow-audit.mjs` `EXCEPTIONS`; a hit is reported above, never counted as a failure.', '');
for (const ex of EXCEPTIONS) L.push(`- **${ex.id}** (${exceptionHits.filter((f) => f.exception === ex.id).length} hits) — ${ex.why}`);
L.push('', '## Not checked', '',
  '- DOM text (captions, the frame\'s menu, the entrance\'s own panels): only canvas text is drawn here.',
  '- Which surface the player is facing: a surface behind the head that redraws still counts.',
  '- Sound: whether a voice or a clip overlaps another is invisible here (headless, no audio).',
  '- The walker\'s press rhythm (about 2.2 s) hides every "too fast" a press ended; the report counts those in the run summary only.');
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, L.join('\n') + '\n');
writeFileSync(join(DIR, 'findings.json'), JSON.stringify({ label, sha, timeMode: TIME_MODE, durationS: END_T, medianFps: medFps,
  findings: findings.map(slim), exceptions: exceptionHits.map(slim), pressEnded, clockJumps: clockJumps.length }, null, 1));
function slim(f) { const { members, voices, g, ...rest } = f; return { ...rest, canvas: f.canvas, state: g }; }

console.log(`flow-audit: ${findings.length} findings (${tot('too fast')} too fast, ${tot('overlap')} overlap, ${tot('voices')} voices, ${tot('stream')} streams, ${tot('clock')} clock groups), ${exceptionHits.length} by design`);
console.log('report → ' + reportPath.replace(ROOT + '/', ''));
