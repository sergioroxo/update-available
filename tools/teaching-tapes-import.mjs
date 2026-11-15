#!/usr/bin/env node
/**
 * ⚑ S392 / S394 (UiB jobs 26 and 27 Part B; S390 before them) — THE TAPES' FILES INTO THE PIECE, CHECKED AGAINST THE A/B
 * INTERFACE (v4, and v5 since S394).
 *
 *     node tools/teaching-tapes-import.mjs                       # re-read public/assets/video/teaching/* and regenerate the data
 *     node tools/teaching-tapes-import.mjs --version v5          # copy each tape's output/teaching-tapes/<tape>-v5/web/ in first
 *     node tools/teaching-tapes-import.mjs --version v5 --only 2016   # one tape (the others are re-read as they are)
 *     node tools/teaching-tapes-import.mjs --1997 <web dir> --2016 <web dir> --2026 <web dir>   # copy a named web/ folder in first
 *
 * `--version vN` reads `<tape>-vN/web/` under `--from <dir>` (default: this checkout's output/teaching-tapes, else the main
 * checkout's — a worktree has no output/ of its own) and refuses a folder without its READY file (Part A writes it last).
 *
 * ⚑ S394 (job 27 B6) — web.mp4 IS NO LONGER SHIPPED: the era sites play room.mp4 with the margin as page text, so it is
 * never copied and any web.mp4 left in public/ is removed (the web copy stays on the pages and OneDrive). v5's margin is
 * `head` + `text` + `source` (V5_INTERFACE.md); a v4 margin (one `text`) is read as head = its kind ("TAUGHT IN" / "KNOWN").
 * v5 brings break_long.json (the long break for the era site); for a v4 tape it is made here from break.json's sentences and
 * every margin line's, fact's and document's source, so the sites carry the same shape before v5 lands.
 *
 * Each tape's `web/` folder (Part A, S391; output/teaching-tapes/V4_INTERFACE.md) holds room.mp4 (the room's TV: no margin,
 * no captions burned in), web.mp4 (the era website's: the margin as a lower strip and the captions burned in), chapters.json
 * (with `partOneEnd`, where the tape stops by itself), margin.json, captions.vtt, sources.json and break.json. This copies a
 * folder named on the command line into public/assets/video/teaching/<tape>/ (the files load from the same origin, like the
 * opening advert), checks every file against the interface, and writes data/room/teaching_tapes.json — the one copy the code
 * imports (src/narrative/teachingTapes.ts): the piece makes no request for a JSON file at run time (the no-network law).
 *
 * Checks (exit 1 on any failure): H.264 Main or Baseline, yuv420p, AAC; room.mp4 at most 960 × 720 and 12 MB, web.mp4 at most
 * 1280 × 720 and 15 MB; a keyframe at least every 2 s (so ⏮ ⏭ seek cleanly); `+faststart`; the two copies the same length
 * (± 0.1 s: one place serves both); the chapters contiguous from 0, their last `end` at the file's own duration (± 0.25 s),
 * kinds from the interface; `partOneEnd` inside the `endcard` chapter; the margin: ≤ 90 characters, ≥ 6 s, never two at
 * once, never over the label, the end card, the break or the credits, each with a source; the captions parse.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : null; };
const TAPES = ['1997', '2016', '2026'];
const KINDS = new Set(['label', 'title', 'lesson', 'commercial', 'trailer', 'menu', 'endcard', 'collapse', 'break', 'credits']);
const NO_MARGIN = new Set(['label', 'endcard', 'break', 'credits']);
/** ⚑ S394 — web.mp4 is not among them: it is no longer shipped (B6) */
const FILES = ['room.mp4', 'chapters.json', 'margin.json', 'captions.vtt', 'sources.json', 'break.json'];
/** ⚑ S392 — the tape's large in-video type (the label, the End of Part 1 card, the break) as timed text, drawn live in the
 *  set's bar at a readable size; ⚑ S394 — and v5's long break for the era site (made here for a v4 tape) */
const OPTIONAL = ['screen_text.vtt', 'break_long.json'];
const PUB = path.join(ROOT, 'public/assets/video/teaching');
const VERSION = flag('version');
const ONLY = flag('only');
/** where `--version` looks for `<tape>-<version>/`: --from, else this checkout's output/teaching-tapes, else any other
 *  worktree's of the same repository (git worktree list: Part A writes into its own checkout's output/, which a Part B
 *  worktree does not have) — the first that has the tape's folder */
function versionRoots() {
  const given = flag('from');
  if (given) return [path.resolve(given)];
  const roots = [path.join(ROOT, 'output/teaching-tapes')];
  try {
    const list = execFileSync('git', ['-C', ROOT, 'worktree', 'list', '--porcelain']).toString();
    for (const l of list.split('\n')) if (l.startsWith('worktree ')) roots.push(path.join(l.slice(9).trim(), 'output/teaching-tapes'));
  } catch { /* not a git checkout */ }
  return [...new Set(roots)];
}
const versionDir = (tape) => {
  const roots = versionRoots();
  const found = roots.map((r) => path.join(r, `${tape}-${VERSION}`, 'web')).find((d) => fs.existsSync(d));
  return found ?? path.join(roots[0], `${tape}-${VERSION}`, 'web');
};
const errors = [];
const note = [];
const fail = (t, m) => errors.push(`${t}: ${m}`);

const probe = (file) => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries',
  'format=duration,size:stream=codec_type,codec_name,profile,pix_fmt,width,height,sample_rate,channels,bit_rate', '-of', 'json', file]).toString());
const keyframes = (file) => execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-skip_frame', 'nokey', '-show_entries',
  'frame=pts_time', '-of', 'csv=p=0', file]).toString().split('\n').map((l) => parseFloat(l)).filter((n) => Number.isFinite(n));
/** +faststart: the 'moov' box comes before 'mdat' in the file */
const faststart = (file) => {
  const fd = fs.openSync(file, 'r'); const buf = Buffer.alloc(8); let pos = 0; const size = fs.statSync(file).size;
  try {
    while (pos < size) {
      fs.readSync(fd, buf, 0, 8, pos);
      let len = buf.readUInt32BE(0); const type = buf.toString('latin1', 4, 8);
      if (type === 'moov') return true;
      if (type === 'mdat') return false;
      if (len === 1) { const b = Buffer.alloc(8); fs.readSync(fd, b, 0, 8, pos + 8); len = Number(b.readBigUInt64BE(0)); }
      if (len < 8) return false;
      pos += len;
    }
    return false;
  } finally { fs.closeSync(fd); }
};
/** WebVTT → cues (seconds; the text's lines joined by a newline; tags stripped) */
function parseVtt(src) {
  const t = (s) => { const p = s.trim().split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; };
  const out = [];
  for (const block of src.replace(/\r/g, '').split(/\n\n+/)) {
    const lines = block.split('\n').filter((l) => l.trim() !== '');
    const i = lines.findIndex((l) => l.includes('-->'));
    if (i < 0) continue;
    const [a, b] = lines[i].split('-->');
    const text = lines.slice(i + 1).join('\n').replace(/<[^>]+>/g, '').trim();
    if (text) out.push({ start: Math.round(t(a) * 1000) / 1000, end: Math.round(t(b.trim().split(/\s+/)[0]) * 1000) / 1000, text });
  }
  return out;
}

/**
 * ⚑ S394 — a v4 tape's long break, in v5's shape: the programme's own admission, then what the teaching asked of people (the
 * break's sentences, each with its source), then every source in the tape's order (each margin line's, the break's, the facts,
 * the documents), each once.
 */
function synthLong(chapters, lines, brk, src) {
  const title = chapters.find((k) => k.kind === 'break')?.title ?? 'What this asked of people';
  const sections = [];
  if (brk?.admission?.length) sections.push({ heading: 'In the programme’s own words', items: brk.admission.map((a) => ({ text: /^[“"‘']/.test(a.text) ? a.text : `“${a.text}”`, source: a.source ?? '' })) });
  if (brk?.sentences?.length) sections.push({ heading: title, items: brk.sentences.map((x) => ({ text: x.text, source: x.source ?? '' })) });
  const seen = new Set(), sources = [];
  const add = (x) => { const k = String(x).trim(); if (k && !seen.has(k)) { seen.add(k); sources.push(k); } };
  for (const m of lines) add(m.source);
  for (const a of brk?.admission ?? []) add(a.source);
  for (const x of brk?.sentences ?? []) add(x.source);
  for (const f of src?.facts ?? []) add(`${f.text} — ${f.source}${f.url ? ` (${f.url})` : ''}`);
  for (const d of src?.documents ?? []) add(`${d.title}${d.organisation ? `, ${d.organisation}` : ''}${d.year ? ` (${d.year})` : ''}${d.pages ? `, ${d.pages}` : ''}${d.archive ? ` — ${d.archive}` : ''}`);
  return { title, intro: '', sections, sources, synthesised: true };
}

const out = { _doc: 'GENERATED by tools/teaching-tapes-import.mjs from public/assets/video/teaching/<tape>/ (Part A\'s web/ folders: v4 S391, v5 S393; interfaces output/teaching-tapes/V4_INTERFACE.md and V5_INTERFACE.md). Do not edit: re-run the tool. Read by src/narrative/teachingTapes.ts. `file` paths are relative to the app root (same origin). web.mp4 is not shipped (S394).', tapes: {} };
for (const tape of TAPES) {
  const dir = path.join(PUB, tape);
  let from = flag(tape);
  if (!from && VERSION && (!ONLY || ONLY === tape)) {
    from = versionDir(tape);
    // a tape not ready yet keeps what the piece has (its v4): the one command is re-run when the others land (--strict refuses)
    if (!fs.existsSync(path.join(from, 'READY'))) {
      if (argv.includes('--strict')) fail(tape, `${from} has no READY (Part A writes it last)`);
      else note.push(`${tape}: ${from} has no READY yet — kept as it is`);
      from = null;
    }
  }
  if (from) {
    fs.mkdirSync(dir, { recursive: true });
    for (const f of FILES) {
      const src = path.join(from, f);
      if (!fs.existsSync(src)) { fail(tape, `missing ${src}`); continue; }
      fs.copyFileSync(src, path.join(dir, f));
    }
    // an optional file the new folder does not have is not left behind from an older version
    for (const f of OPTIONAL) { if (fs.existsSync(path.join(from, f))) fs.copyFileSync(path.join(from, f), path.join(dir, f)); else if (fs.existsSync(path.join(dir, f))) fs.rmSync(path.join(dir, f)); }
    note.push(`${tape}: copied from ${from}`);
  }
  // S390's cuts are retired (the 59 s short tape he rejected); ⚑ S394: and web.mp4 is no longer shipped (B6), so a copy left
  //   here by an older import is removed (it stays in Part A's folders, on the pages and OneDrive)
  for (const old of ['short.mp4', 'full.mp4', 'web.mp4']) if (fs.existsSync(path.join(dir, old))) { fs.rmSync(path.join(dir, old)); note.push(`${tape}: removed ${old} (not shipped)`); }
  const read = (f) => { const p = path.join(dir, f); if (!fs.existsSync(p)) { fail(tape, `no ${f}`); return null; } return fs.readFileSync(p, 'utf8'); };
  const chRaw = read('chapters.json'); if (!chRaw) continue;
  const ch = JSON.parse(chRaw);
  const margin = JSON.parse(read('margin.json') ?? '{"lines":[]}');
  const sources = JSON.parse(read('sources.json') ?? 'null');
  const brk = JSON.parse(read('break.json') ?? 'null');
  const longPath = path.join(dir, 'break_long.json');
  const brkLong = fs.existsSync(longPath) ? JSON.parse(fs.readFileSync(longPath, 'utf8')) : null;
  const cues = parseVtt(read('captions.vtt') ?? '');
  const screenPath = path.join(dir, 'screen_text.vtt');
  const screen = fs.existsSync(screenPath) ? parseVtt(fs.readFileSync(screenPath, 'utf8')) : [];
  if (!screen.length) note.push(`${tape}: no screen_text.vtt (the label, the end card and the break are only in the picture)`);
  const entry = { tape, title: ch.title, version: ch.version ?? 'v4', music: ch.music ?? sources?.music ?? '', placeholder: !!ch.placeholder || !!margin.placeholder,
    duration: 0, partOneEnd: Number(ch.partOneEnd) };
  const durs = {};
  for (const [cut, maxW, maxH, maxMB] of [['room', 960, 720, 12]]) {
    const file = path.join(dir, `${cut}.mp4`);
    if (!fs.existsSync(file)) { fail(tape, `missing ${file}`); continue; }
    const p = probe(file);
    const v = p.streams.find((s) => s.codec_type === 'video'), a = p.streams.find((s) => s.codec_type === 'audio');
    const dur = Number(p.format.duration), bytes = Number(p.format.size);
    durs[cut] = dur;
    if (!v || v.codec_name !== 'h264') fail(tape, `${cut}: video is not H.264`);
    else {
      if (!/^(Main|Constrained Baseline|Baseline)$/.test(v.profile)) fail(tape, `${cut}: H.264 profile ${v.profile} (Main asked)`);
      if (v.pix_fmt !== 'yuv420p') fail(tape, `${cut}: pix_fmt ${v.pix_fmt}`);
      if (v.width > maxW || v.height > maxH) fail(tape, `${cut}: ${v.width}×${v.height} is over ${maxW}×${maxH}`);
    }
    if (!a || a.codec_name !== 'aac') fail(tape, `${cut}: audio is not AAC`);
    if (bytes > maxMB * 1024 * 1024) fail(tape, `${cut}: ${(bytes / 1048576).toFixed(1)} MB is over ${maxMB} MB`);
    const ks = keyframes(file); let gap = 0;
    for (let i = 1; i < ks.length; i++) gap = Math.max(gap, ks[i] - ks[i - 1]);
    gap = Math.max(gap, dur - (ks[ks.length - 1] ?? 0));
    if (gap > 2.05) fail(tape, `${cut}: a keyframe gap of ${gap.toFixed(2)} s (≤ 2 s asked)`);
    if (!faststart(file)) fail(tape, `${cut}: not +faststart (moov after mdat)`);
    entry[cut] = { file: `assets/video/teaching/${tape}/${cut}.mp4`, duration: Math.round(dur * 1000) / 1000, bytes, width: v?.width ?? 0, height: v?.height ?? 0 };
    note.push(`${tape} ${cut}: ${dur.toFixed(1)} s, ${v?.width}×${v?.height} ${v?.profile}, ${(bytes / 1048576).toFixed(2)} MB, keyframes ≤ ${gap.toFixed(2)} s`);
  }
  entry.duration = Math.round((durs.room ?? 0) * 1000) / 1000;
  const chapters = ch.chapters ?? [];
  let t = 0;
  for (const k of chapters) {
    if (!KINDS.has(k.kind)) fail(tape, `chapter ${k.id} kind "${k.kind}"`);
    if (Math.abs(k.start - t) > 0.05) fail(tape, `chapter ${k.id} starts at ${k.start}, the last ended at ${t}`);
    if (!(k.end > k.start)) fail(tape, `chapter ${k.id} has no length`);
    t = k.end;
  }
  if (Math.abs(t - entry.duration) > 0.25) fail(tape, `the chapters end at ${t}, the file at ${entry.duration}`);
  const endcard = chapters.find((k) => k.kind === 'endcard');
  if (!endcard) fail(tape, 'no endcard chapter ("End of Part 1")');
  else if (!(entry.partOneEnd > endcard.start && entry.partOneEnd < endcard.end)) fail(tape, `partOneEnd ${entry.partOneEnd} is not inside the endcard ${endcard.start}–${endcard.end}`);
  // ⚑ S394 — v5: `head` (the kind and the short source, ≤ 60) + `text` (≤ 70, or "") + `source` (the full citation, never on
  //   screen). v4: one `text` (≤ 90); its head is its kind's own tag.
  const V5 = (margin.lines ?? []).some((m) => typeof m.head === 'string');
  const HEAD = { TAUGHT_IN: 'TAUGHT IN', WHAT_IS_KNOWN: 'KNOWN' };
  const lines = (margin.lines ?? []).map((m) => ({ start: Number(m.start), end: Number(m.end), kind: m.kind,
    head: typeof m.head === 'string' ? m.head : HEAD[m.kind] ?? String(m.kind),
    text: margin.prefixed ? String(m.text ?? '').replace(/^(TAUGHT IN|WHAT IS KNOWN|KNOWN)\s*:\s*/i, '') : String(m.text ?? ''), source: m.source ?? '' }))
    .sort((a, b) => a.start - b.start);
  lines.forEach((m, i) => {
    if (m.kind !== 'TAUGHT_IN' && m.kind !== 'WHAT_IS_KNOWN') fail(tape, `margin ${i}: kind ${m.kind}`);
    if (V5 && m.head.length > 60) fail(tape, `margin ${i}: head ${m.head.length} characters (≤ 60)`);
    if (m.text.length > (V5 ? 70 : 90)) fail(tape, `margin ${i}: ${m.text.length} characters (≤ ${V5 ? 70 : 90})`);
    if (m.end - m.start < 5.95) fail(tape, `margin ${i}: ${(m.end - m.start).toFixed(1)} s on screen (≥ 6 s)`);
    if (!m.source) fail(tape, `margin ${i}: no source`);
    if (i && m.start < lines[i - 1].end - 0.01) fail(tape, `margin ${i} overlaps the line before it`);
    const over = chapters.find((k) => NO_MARGIN.has(k.kind) && m.start < k.end - 0.01 && m.end > k.start + 0.01);
    if (over) fail(tape, `margin ${i} runs over the ${over.kind} (${over.id})`);
  });
  // ⚑ S394 — THE LONG BREAK for the era site: v5's break_long.json, or (a v4 tape) made from break.json and the sources
  const breakLong = brkLong ? {
    title: String(brkLong.title ?? ''), intro: brkLong.intro ? String(brkLong.intro) : '',
    sections: (brkLong.sections ?? []).map((sec) => ({ heading: String(sec.heading ?? ''), items: (sec.items ?? []).map((it) => ({ text: String(it.text ?? ''), source: String(it.source ?? '') })) })),
    sources: (brkLong.sources ?? []).map(String)
  } : synthLong(chapters, lines, brk, sources);
  if (brkLong) {
    if (!breakLong.sections.length) fail(tape, 'break_long.json has no sections');
    breakLong.sections.forEach((sec, i) => sec.items.forEach((it, j) => { if (!it.source) fail(tape, `break_long section ${i} item ${j}: no source`); }));
    if (!breakLong.sources.length) fail(tape, 'break_long.json has no sources');
  } else note.push(`${tape}: no break_long.json — the long break made from break.json and the sources (v4)`);
  // ⚑ S392 — nothing private reaches a public page: these files are printed on the era websites (a v3 sources.json carried
  //   "his folder ~/Pc_Simulation/…" as an archive line). A local path, a user folder or a person's folder is refused.
  const PRIVATE = /~\/|\/Users\/|\bhis folder\b|Pc_Simulation|OneDrive|sk=/;
  const scan = (label, v) => { const txt = JSON.stringify(v ?? ''); const m = txt.match(PRIVATE); if (m) fail(tape, `${label} carries a private path ("${m[0]}"): ${txt.slice(Math.max(0, m.index - 40), m.index + 60)}`); };
  // ⚑ S394 — v5's break bar: drawn by the set during `on` (inside the break), printed on the era site, with its source
  if (brk && (brk.barHead || brk.on)) {
    const on = brk.on;
    if (!Array.isArray(on) || !(on[1] > on[0]) || on[1] > entry.duration + 0.05) fail(tape, `break.json "on" ${JSON.stringify(on)} is not a span inside the tape`);
    if (!brk.barHead) fail(tape, 'break.json has "on" but no barHead');
    else if (brk.barHead.length > 60) fail(tape, `break.json barHead ${brk.barHead.length} characters (≤ 60)`);
    if ((brk.bar ?? '').length > 70) fail(tape, `break.json bar ${brk.bar.length} characters (≤ 70)`);
    if (!brk.barSource) fail(tape, 'break.json barHead has no barSource');
    if (Array.isArray(on) && lines.some((m) => m.start < on[1] - 0.01 && m.end > on[0] + 0.01)) fail(tape, 'a margin line runs over the break bar');
  }
  scan('sources.json', sources); scan('margin.json', lines); scan('break.json', brk); scan('chapters.json', chapters); scan('break_long', breakLong);
  entry.chapters = chapters.map(({ id, kind, title, start, end }) => ({ id, kind, title, start, end }));
  entry.margin = lines;
  entry.cues = cues;
  entry.screen = screen;
  entry.sources = sources;
  entry.break = brk;
  entry.breakLong = breakLong;
  note.push(`${tape} (${entry.version}): ${chapters.length} chapters, Part 1 ends at ${entry.partOneEnd}, ${lines.length} margin lines, ${cues.length} captions, ${screen.length} screen-text cues, long break ${breakLong.sections.reduce((a, x) => a + x.items.length, 0)} items + ${breakLong.sources.length} sources${entry.placeholder ? ' — PLACEHOLDER' : ''}`);
  out.tapes[tape] = entry;
}
for (const n of note) console.log('  ' + n);
if (errors.length) { console.error('teaching tapes: FAILED\n  ' + errors.join('\n  ')); process.exit(1); }
fs.writeFileSync(path.join(ROOT, 'data/room/teaching_tapes.json'), JSON.stringify(out, null, 1) + '\n');
console.log('teaching tapes OK → data/room/teaching_tapes.json' + (Object.values(out.tapes).some((t) => t.placeholder) ? ' (PLACEHOLDERS in it)' : ''));
// the era websites credit each tape from this data (tools/gen_era_sites.mjs): regenerate them so they cannot go stale
execFileSync('node', [path.join(ROOT, 'tools/gen_era_sites.mjs')], { stdio: 'ignore' });
console.log('era websites regenerated (tools/gen_era_sites.mjs)');
