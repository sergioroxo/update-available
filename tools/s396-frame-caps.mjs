#!/usr/bin/env node
/**
 * S396 FRAME CAPS — the capitals a v6 tape burns into its own bar, measured on its delivered frames (UiB job 28 B1).
 *
 *     node tools/s396-frame-caps.mjs --web <a tape's web/ folder> [--web <another>] [--json out.json]
 *
 * ⚑ WHY. From v6 the set draws nothing over the tape: the subtitles and the [n] line are in the picture (his 16 Nov,
 * "There is a play button on the screen for a TV that already has a play button"; V6_INTERFACE.md). So the floors the
 * set's own bar used to keep (1.0° in the headset, 14 px on the computer, 12 px on the phone) are now the TAPE's to keep,
 * and only the delivered frames can say whether it does. For every caption cue (captions.vtt) and every [n] line
 * (bar.json) this pulls the frame at the moment's middle from room.mp4, finds the dark bar at the foot of the picture,
 * splits its ink into text lines (the thin rule between them splits subtitles from the [n] line), and measures each line
 * from the top of its capitals to its baseline (the top is the first row carrying 2 % of the line's busiest row and at
 * least 3 px, so a speck does not count; the baseline is the last row carrying 35 %, so descenders do not). The
 * precision is a frame row (1.5 px of 1080 for a 720-high room copy); ascenders as tall as capitals count as capitals.
 *
 * The held set maps a 1080-high frame to the glass (job 27's bar-fit probe): 1 frame px of 1080 = 0.0341° in the headset,
 * 0.492 px on the computer, 0.284 px on the phone. The rules (V6_INTERFACE.md): subtitles' capitals ≥ 46 px of 1080 (all
 * floors pass); the [n] line's ≥ 32 px of 1080 (1.09°, 15.7 px; the phone below its floor, accepted for this line only).
 * Reads only local files; writes nothing unless --json is given.
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const webs = [];
let jsonOut = null, barTopK = 0.745, topK = 0.02;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--web') webs.push(resolve(args[++i]));
  else if (args[i] === '--json') jsonOut = resolve(args[++i]);
  else if (args[i] === '--bar-top') barTopK = Number(args[++i]);
  else if (args[i] === '--top') topK = Number(args[++i]);
}
if (!webs.length) { console.error('usage: node tools/s396-frame-caps.mjs --web <tape web/ folder> [--web …] [--json out.json]'); process.exit(2); }

const PER = { headset: 0.0341, computer: 0.492, phone: 0.284 };   // per frame px of 1080
const FLOOR = { headset: 1.0, computer: 14, phone: 12 };
const RULE = { subtitles: 46, n: 32, sound: 0 };                   // capitals, frame px of 1080 (a sound label — "[chimes]" — has
                                                                   //   no rule of its own: reported, never failed)

const vttTime = (s) => { const p = s.trim().split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; };
function cues(file) {
  if (!existsSync(file)) return [];
  const out = [];
  for (const block of readFileSync(file, 'utf8').replace(/\r/g, '').split(/\n\n+/)) {
    const lines = block.split('\n');
    const i = lines.findIndex((l) => l.includes('-->'));
    if (i < 0) continue;
    const [a, b] = lines[i].split('-->').map((x) => vttTime(x.split(' ').filter(Boolean)[0]));
    out.push({ start: a, end: b, text: lines.slice(i + 1).join(' ').trim() });
  }
  return out;
}
function probe(file) {
  const o = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file]).toString().trim().split(',').map(Number);
  return { w: o[0], h: o[1] };
}
function frame(file, t, w, h) {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-ss', t.toFixed(3), '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: w * h * 2 });
  return buf.subarray(0, w * h);
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

/**
 * the bar's text lines in one frame, in frame px: { rule, lines: [{ top, base, cap, inkTop, inkBottom, below }] }. The rule is
 * the lowest thin row across the frame (its median differs from the rows 3 px above and below it); ink is what is much
 * brighter than its own row's median (a row's median is its background: text covers less than half a row, and a gradient
 * bar is followed row by row). The [n] line is the ink under the rule; the subtitles are at most the TWO lines directly
 * above it (V6: ≤ 2 lines), the second only when it sits close (a gap under 0.6 of a line), so the picture's own type above
 * the bar is never taken for a subtitle. Without a rule, the lines are taken upward from the foot the same way.
 */
function measure(px, w, h) {
  const lum = (x, y) => px[y * w + x];
  const med = new Array(h);
  for (let y = 0; y < h; y++) { const r = []; for (let x = 0; x < w; x += 2) r.push(lum(x, y)); med[y] = median(r); }
  const rawInk = (y) => { let n = 0; for (let x = 0; x < w; x++) if (lum(x, y) - med[y] > 70) n++; return n; };
  // (a text row's median can lift too — a heavy baseline — so the rule must also have no ink 3 px above and below it)
  let rule = -1;
  for (let y = h - 4; y > h * 0.55; y--) {
    if (Math.abs(med[y] - med[y - 3]) > 14 && Math.abs(med[y] - med[y + 3]) > 14 && rawInk(y - 3) < w * 0.02 && rawInk(y + 3) < w * 0.02) { rule = y; break; }
  }
  const ink = (y) => (rule >= 0 && Math.abs(y - rule) <= 1 ? 0 : rawInk(y));
  const runs = [];
  let cur = null, gap = 0;
  for (let y = Math.floor(h * 0.4); y < h; y++) {
    const n = ink(y);
    if (n >= 2) { if (!cur) cur = []; cur.push([y, n]); gap = 0; }
    else if (cur) { gap++; if (gap >= 4) { runs.push(cur); cur = null; gap = 0; } }   // (a condensed face can leave a 2-row seam inside a line)
  }
  if (cur) runs.push(cur);
  const lines = runs.filter((l) => l.length > 3 && Math.max(...l.map(([, n]) => n)) >= 3).map((l) => {
    const max = Math.max(...l.map(([, n]) => n));
    const capTop = l.find(([, n]) => n >= Math.max(3, topK * max))[0];
    const base = [...l].reverse().find(([, n]) => n >= 0.35 * max)[0];
    return { top: capTop, base, cap: base - capTop + 1, inkTop: l[0][0], inkBottom: l[l.length - 1][0], below: rule >= 0 && l[0][0] > rule };
  });
  // the subtitles: up to two lines, upward from the rule (or the foot), the second only if close
  // (only inside the bar: the picture is the frame's upper `barTopK` — V6: 1440×810 of 1440×1080 — and its own big type,
  //   which stands in for a subtitle by design, is not a subtitle)
  const above = lines.filter((l) => !l.below && (rule < 0 || l.inkBottom < rule) && l.inkTop >= h * barTopK - 2).sort((p, q) => q.inkTop - p.inkTop);
  const subs = [];
  for (const l of above) {
    if (!subs.length) { subs.push(l); continue; }
    const prev = subs[subs.length - 1];
    if (subs.length < 2 && prev.inkTop - l.inkBottom < 0.6 * (prev.inkBottom - prev.inkTop + 1)) subs.push(l); else break;
  }
  for (const l of lines) l.sub = subs.includes(l);
  return { rule, lines };
}

const report = [];
let failures = 0;
for (const web of webs) {
  const mp4 = join(web, 'room.mp4');
  if (!existsSync(mp4)) { console.error(`${web}: no room.mp4`); failures++; continue; }
  const { w, h } = probe(mp4);
  const k = 1080 / h;
  const tape = (() => { try { return JSON.parse(readFileSync(join(web, 'chapters.json'), 'utf8')).tape; } catch { return web; } })();
  const bar = existsSync(join(web, 'bar.json')) ? JSON.parse(readFileSync(join(web, 'bar.json'), 'utf8')).lines : [];
  const moments = [...cues(join(web, 'captions.vtt')).map((c) => ({ kind: /^\[[^\]]*\]$/.test(c.text.trim()) ? 'sound' : 'subtitles', ...c })), ...bar.map((b) => ({ kind: 'n', ...b }))];
  const rows = [];
  for (const m of moments) {
    const t = (m.start + m.end) / 2;
    const { lines, rule } = measure(frame(mp4, t, w, h), w, h);
    // subtitles: the lines above the rule (or every line when there is no rule); the [n] line: the line under it
    const pick = m.kind === 'n' ? lines.filter((l) => l.below) : lines.filter((l) => l.sub);   // a sound label sits where a subtitle sits
    // a cue with no subtitle in the bar: the picture carries it as big type (V6: "a big caption is never repeated as a
    //   subtitle"); listed for a person to look at, not counted as a failure. An [n] line must always be there.
    if (!pick.length) { rows.push({ kind: m.kind, t: +t.toFixed(2), text: m.text.slice(0, 60), found: false, rule }); if (m.kind === 'n') failures++; continue; }
    // one size of type per moment: the line with the most capitals and ascenders gives it (a line of x-height letters —
    //   "names three roots:" — would read its x-height as the size)
    const cap = Math.max(...pick.map((l) => l.cap)) * k;
    const row = { kind: m.kind, t: +t.toFixed(2), text: m.text.slice(0, 60), found: true, lines: pick.length, cap1080: +cap.toFixed(1),
      headset: +(cap * PER.headset).toFixed(2), computer: +(cap * PER.computer).toFixed(1), phone: +(cap * PER.phone).toFixed(1) };
    row.rule = cap >= RULE[m.kind] - 0.5;
    row.floors = { headset: row.headset >= FLOOR.headset, computer: row.computer >= FLOOR.computer, phone: row.phone >= FLOOR.phone };
    if (!row.rule) failures++;
    rows.push(row);
  }
  const sum = (kind) => {
    const r = rows.filter((x) => x.kind === kind && x.found);
    if (!r.length) return null;
    const c = r.map((x) => x.cap1080);
    const lo = Math.min(...c), hi = Math.max(...c);
    return { moments: r.length, cap1080: [lo, hi], headset: [+(lo * PER.headset).toFixed(2), +(hi * PER.headset).toFixed(2)],
      computer: [+(lo * PER.computer).toFixed(1), +(hi * PER.computer).toFixed(1)], phone: [+(lo * PER.phone).toFixed(1), +(hi * PER.phone).toFixed(1)],
      underRule: r.filter((x) => !x.rule).length };
  };
  const entry = { tape, web, frame: `${w}×${h}`, subtitles: sum('subtitles'), n: sum('n'), sound: sum('sound'), notFound: rows.filter((x) => !x.found).length, rows };
  report.push(entry);
  const fmt = (s, name) => s ? `${name}: ${s.moments} moments, capitals ${s.cap1080[0]}–${s.cap1080[1]} px of 1080 = ${s.headset[0]}–${s.headset[1]}° headset, ${s.computer[0]}–${s.computer[1]} px computer, ${s.phone[0]}–${s.phone[1]} px phone; under the rule (${RULE[name === 'subtitles' ? 'subtitles' : 'n']} px): ${s.underRule}` : `${name}: none measured`;
  //   (rows of a sound label pass: no rule)
  console.log(`== ${tape} (${w}×${h})`);
  console.log('  ' + fmt(entry.subtitles, 'subtitles'));
  console.log('  ' + fmt(entry.n, '[n] line'));
  if (entry.sound) console.log(`  sound labels ([…], no rule of their own): ${entry.sound.moments}, ${entry.sound.cap1080[0]}–${entry.sound.cap1080[1]} px of 1080 = ${entry.sound.headset[0]}–${entry.sound.headset[1]}° headset, ${entry.sound.computer[0]}–${entry.sound.computer[1]} px computer, ${entry.sound.phone[0]}–${entry.sound.phone[1]} px phone (floors ${FLOOR.headset}° / ${FLOOR.computer} / ${FLOOR.phone} px)`);
  if (entry.notFound) console.log(`  not in the bar (subtitles: the picture's big type carries them — look; [n]: a failure): ${entry.notFound}: ${rows.filter((x) => !x.found).map((x) => `${x.kind}@${x.t} "${x.text.slice(0, 32)}"`).join(', ')}`);
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(report, null, 1));
console.log(failures ? `FRAME CAPS: ${failures} moment(s) under the rule or not found` : 'FRAME CAPS OK: every moment meets the v6 rule');
process.exit(failures ? 1 : 0);
