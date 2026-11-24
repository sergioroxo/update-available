#!/usr/bin/env node
// ⚑ S357gf (24 Nov 2026) — after a headset trial: find every checklist item in the trial-watch log, on the Mac's clock,
// and put beside it the pictures, the frame rate, the draw calls, the console, and his own words (if the voice
// transcript is given). Writes <out>/TRIAL_REPORT.md. A reader then looks at each item's frames and his words.
//
// Usage: node tools/trial-report.mjs --out out/trial-2026-11-24 [--items tools/trial-items.json]
//                                    [--voice "<whisper _clock.tsv>"] [--voice-offset <s>]
// The voice tsv has columns clock_time, offset_seconds, text (the 20 Nov method); --voice-offset shifts it if the
// recording's start was not said to the second.
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const OUT = opt('out');
if (!OUT) { console.error('--out <trial folder> is required'); process.exit(2); }
const ITEMS = JSON.parse(readFileSync(opt('items', 'tools/trial-items.json'), 'utf8')).items;
const VOICE = opt('voice', null);
const VOFF = Number(opt('voice-offset', '0'));

const lines = readFileSync(join(OUT, 'log.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const day = new Date(lines[0].t); day.setHours(0, 0, 0, 0);
const clock = (t) => new Date(t).toTimeString().slice(0, 8);
const secOfDay = (hhmmss) => { const [h, m, s] = hhmmss.split(':').map(Number); return h * 3600 + m * 60 + s; };
const tOf = (hhmmss) => day.getTime() + secOfDay(hhmmss) * 1000;

// ── the timeline of tokens
const tokens = [];
let lastPhone = '', lastEra = '';
const tokenOf = (k, x) => {
  if (typeof x === 'string' || typeof x === 'number') return `ledger:${k}:${x}`;
  if (x && typeof x === 'object') {
    const id = x.id ?? x.cardId ?? x.toEra ?? x.stage ?? '';
    return `ledger:${k}:${id}${x.outcome ? ':' + x.outcome : ''}`;
  }
  return `ledger:${k}:?`;
};
for (const l of lines) {
  if (l.kind === 'event') {
    for (const [k, arr] of Object.entries(l.ledger ?? {})) for (const x of arr) tokens.push({ t: l.t, tok: tokenOf(k, x), x });
    for (const b of l.beats ?? []) tokens.push({ t: l.t, tok: `beat:${typeof b === 'string' ? b : b.beat ?? b.id ?? JSON.stringify(b)}` });
    for (const c of l.close ?? []) tokens.push({ t: l.t, tok: `close:${c.stage}` });
  }
  if (l.kind === 'tick' || l.kind === 'event') {
    const ph = l.phone ? `${l.phone.stage}/${l.phone.screen}` : '';
    if (ph && ph !== lastPhone) { tokens.push({ t: l.t, tok: `phone:${ph}` }); lastPhone = ph; }
    if (l.era && l.era !== lastEra) { tokens.push({ t: l.t, tok: `era:${l.era}` }); lastEra = l.era; }
  }
  if (l.kind === 'start' || l.kind === 'connected' || l.kind === 'lost') tokens.push({ t: l.t, tok: `watch:${l.kind}` });
}
tokens.sort((a, b) => a.t - b.t);

// ── find each item, in order
const found = [];
let from = 0;
for (const it of ITEMS) {
  const re = new RegExp(it.start);
  const i = tokens.findIndex((k, j) => j >= from && re.test(k.tok));
  if (i < 0) { found.push({ it, start: null }); continue; }
  found.push({ it, start: tokens[i].t - (it.lead ?? 0) * 1000, startTok: tokens[i].tok });
  from = i + 1;
}
for (let n = 0; n < found.length; n++) {
  const f = found[n];
  if (f.start == null) continue;
  let end = null;
  if (f.it.end) {
    const re = new RegExp(f.it.end);
    const e = tokens.find((k) => k.t >= f.start + (f.it.lead ?? 0) * 1000 && re.test(k.tok));
    if (e) end = e.t - (f.it.endLead ?? 0) * 1000;
  }
  if (end == null) end = found.slice(n + 1).find((g) => g.start != null)?.start ?? lines.at(-1).t;
  f.end = Math.max(end, f.start + 1000);
}

// ── what lies in each window
const frameList = (dir) => (existsSync(join(OUT, dir)) ? readdirSync(join(OUT, dir)).filter((f) => /^\d{6}\.png$/.test(f)).sort() : []);
const frames = { adb: frameList('frames'), screen: frameList('screen') };
const frameT = (f) => tOf(`${f.slice(0, 2)}:${f.slice(2, 4)}:${f.slice(4, 6)}`);
let voice = [];
if (VOICE && existsSync(VOICE)) {
  voice = readFileSync(VOICE, 'utf8').split('\n').slice(1).map((l) => l.split('\t')).filter((c) => c.length >= 3 && /\d:\d\d/.test(c[0]))
    .map((c) => ({ t: tOf(c[0].length === 5 ? c[0] + ':00' : c[0]) + VOFF * 1000, text: c.slice(2).join(' ').trim() }));
}
const pick = (arr, n) => (arr.length <= n ? arr : Array.from({ length: n }, (_, i) => arr[Math.round((i * (arr.length - 1)) / (n - 1))]));
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };

let md = `STATUS: live\n\n# Trial report — ${OUT}\n\n*Made by \`tools/trial-report.mjs\` from \`log.jsonl\` (the piece read once a second through the cable),` +
  ` the headset's pictures (\`frames/\`), the Mac's screen (\`screen/\`)${voice.length ? ' and his voice' : ''}. Times are the Mac's clock.` +
  ` "FOUND" means the log shows the moment; whether it looked right is his eye's call, written under each item from his words and the frames.*\n\n`;
const lost = lines.filter((l) => l.kind === 'lost');
const errs = lines.filter((l) => l.kind === 'console' || l.kind === 'pageerror');
const ticks = lines.filter((l) => l.kind === 'tick');
md += `- Reads: ${ticks.length}; headset pictures: ${frames.adb.length}; screen pictures: ${frames.screen.length}; times the page was lost: ${lost.length}; console errors/warnings: ${errs.length}.\n`;
md += `- From ${clock(lines[0].t)} to ${clock(lines.at(-1).t)}.\n\n`;
// his "mark": the moments he flagged out loud, with the pictures nearest to them, first
const marks = voice.filter((v) => /\bmark(ed)?\b/i.test(v.text));
if (marks.length) {
  const near = (list, t) => list.filter((x) => Math.abs(frameT(x) - t) <= 8000).slice(0, 4);
  md += `## He said "mark" (${marks.length})\n\n` + marks.map((m) => {
    const item = found.find((f) => f.start != null && m.t >= f.start && m.t < f.end);
    const pics = [...near(frames.adb, m.t).map((x) => `\`frames/${x}\``), ...near(frames.screen, m.t).map((x) => `\`screen/${x}\``)];
    return `- ${clock(m.t)} · ${item ? item.it.id : 'between checks'} · "${m.text}"${pics.length ? ` · ${pics.join(' ')}` : ''}`;
  }).join('\n') + '\n\n';
}
md += `| # | item | found | from → to | s | fps in VR (low / median) | draw calls (peak) | console |\n|---|---|---|---|---|---|---|---|\n`;
found.forEach((f, n) => {
  if (f.start == null) { md += `| ${n + 1} | ${f.it.id} · ${f.it.name} | **NOT FOUND** | | | | | |\n`; return; }
  const w = ticks.filter((l) => l.t >= f.start && l.t < f.end);
  const fps = w.filter((l) => l.xr && l.fps).map((l) => l.fps);
  const dr = w.map((l) => l.draws ?? 0);
  const ce = errs.filter((l) => l.t >= f.start && l.t < f.end).length;
  f.stats = { fps, dr, ce };
  md += `| ${n + 1} | ${f.it.id} · ${f.it.name} | FOUND | ${clock(f.start)} → ${clock(f.end)} | ${Math.round((f.end - f.start) / 1000)} | ${fps.length ? `${Math.min(...fps)} / ${med(fps)}` : '—'} | ${dr.length ? Math.max(...dr) : '—'} | ${ce || ''} |\n`;
});
md += `\n`;
found.forEach((f, n) => {
  md += `## ${n + 1}. ${f.it.id} · ${f.it.name}\n\n`;
  md += `- **What to look for:** ${f.it.eye}\n- **The log can tell:** ${f.it.machine}\n`;
  if (f.start == null) { md += `- **NOT FOUND in the log** (start token \`${f.it.start}\`). Either it did not happen, the path skipped it, or the watcher was not connected.\n\n`; return; }
  md += `- **When:** ${clock(f.start)} → ${clock(f.end)} (anchor \`${f.startTok}\`)\n`;
  const inW = tokens.filter((k) => k.t >= f.start && k.t < f.end).map((k) => `${clock(k.t)} ${k.tok}`);
  if (inW.length) md += `- **Logged inside:**\n${inW.slice(0, 30).map((s) => `  - ${s}`).join('\n')}${inW.length > 30 ? `\n  - … ${inW.length - 30} more` : ''}\n`;
  for (const [src, list] of Object.entries(frames)) {
    const inF = list.filter((x) => { const t = frameT(x); return t >= f.start && t < f.end; });
    if (inF.length) md += `- **${src === 'adb' ? 'Headset pictures' : 'Screen pictures'}** (${inF.length}): ${pick(inF, 6).map((x) => `\`${src === 'adb' ? 'frames' : 'screen'}/${x}\``).join(' ')}\n`;
  }
  const errsIn = errs.filter((l) => l.t >= f.start && l.t < f.end);
  if (errsIn.length) md += `- **Console:**\n${errsIn.slice(0, 8).map((l) => `  - ${clock(l.t)} ${l.level ?? 'error'}: ${l.text}`).join('\n')}\n`;
  const said = voice.filter((v) => v.t >= f.start - 5000 && v.t < f.end + 10000);
  if (voice.length) md += said.length ? `- **He said:**\n${said.map((v) => `  - ${clock(v.t)} "${v.text}"`).join('\n')}\n` : `- **He said:** nothing here.\n`;
  md += `- **Verdict:** _(the reader writes WORKS / PROBLEM / NOT SEEN from his words and the pictures)_\n\n`;
});
writeFileSync(join(OUT, 'TRIAL_REPORT.md'), md);
console.log(`wrote ${join(OUT, 'TRIAL_REPORT.md')}: ${found.filter((f) => f.start != null).length}/${found.length} items found`);
