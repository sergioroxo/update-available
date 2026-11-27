#!/usr/bin/env node
// ⚑ S357gf (24 Nov 2026) — the trial watcher: while Sérgio plays in the Quest, this follows the piece from the Mac.
//
// His ask (24 Nov): "plan those checklist into a way I can do that while with the headset and for the system to look for
// them … we want to connect the headset to the computer and to be able to run the screenshot system of casting".
//
// What it does, on ONE clock (the Mac's):
//   1. the piece's own log, through the USB cable: the Quest Browser's DevTools socket is forwarded with adb, and every
//      second the page is read (?debug=1 probes: __ledger, __os, __closeLog, the 2026 beat log, the 2016 phone's stage,
//      fps and draw calls). New ledger entries, beats and stages are written to log.jsonl as they happen.
//   2. pictures: every --every seconds, the headset's own picture (`adb exec-out screencap -p`, no cast compression) and/or
//      the Mac's screen (`screencapture`, which holds the cast window and the QuickTime timer), named by Mac clock.
//   3. the console: every console error and page error the headset sees.
// It only READS the page: nothing is sent to it but read-only evaluations, nothing is stored on the Quest, and the piece
// makes no network call (the cable is the Mac's debugger, not the page's). Stop: Ctrl-C, or `touch <out>/stop`.
//
// Usage:  node tools/trial-watch.mjs --out out/trial-2026-11-24 [--every 4] [--frames adb|screen|both|none]
//                                     [--port 9222] [--match update-available]
//         (desktop test: open Chrome with --remote-debugging-port=9333 on the piece with ?debug=1, then --port 9333 --no-adb)
// After the run: node tools/trial-report.mjs --out out/trial-2026-11-24 [--voice <whisper _clock.tsv>]
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, appendFileSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const flag = (k) => args.includes('--' + k);
const OUT = opt('out', `out/trial-${new Date().toISOString().slice(0, 10)}`);
const EVERY = Number(opt('every', '4'));
const FRAMES = opt('frames', 'both');
const PORT = Number(opt('port', '9222'));
const MATCH = opt('match', 'update-available');
const NO_ADB = flag('no-adb');
// ⚑ S432 (UiB job 36, T96) — the hands' line, as the piece says it (data/strings/gameMenu.json `xrHandsOnly`): the page's plate is
//   matched against it here, on the Mac's side, so the snapshot stays a plain read
const HANDS_LINE = (() => { try { return JSON.parse(readFileSync(new URL('../data/strings/gameMenu.json', import.meta.url), 'utf8')).xrHandsOnly ?? null; } catch { return null; } })();
mkdirSync(join(OUT, 'frames'), { recursive: true });
mkdirSync(join(OUT, 'screen'), { recursive: true });
const LOG = join(OUT, 'log.jsonl');
const hms = (d = new Date()) => d.toTimeString().slice(0, 8);
const stamp = (d = new Date()) => hms(d).replace(/:/g, '');
const log = (o) => appendFileSync(LOG, JSON.stringify({ t: Date.now(), clock: hms(), ...o }) + '\n');
const say = (s) => console.log(`[${hms()}] ${s}`);

function adb(...a) { return execFileSync('adb', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
function adbDevice() {
  try { return adb('devices').split('\n').slice(1).map((l) => l.trim().split(/\s+/)).find((p) => p[1] === 'device')?.[0] ?? null; }
  catch { return null; }
}
/** The Quest Browser is Chromium: its DevTools listen on an abstract unix socket whose name ends in devtools_remote. */
function forwardDevtools() {
  const unix = adb('shell', 'cat', '/proc/net/unix');
  const names = [...new Set(unix.split('\n').map((l) => l.trim().split(/\s+/).pop()).filter((n) => n && /devtools_remote/.test(n)))]
    .map((n) => n.replace(/^@/, ''));
  if (!names.length) throw new Error('no DevTools socket on the Quest: is the piece open in the Quest Browser, and USB debugging allowed?');
  const name = names.find((n) => /chrome|browser|oculus/i.test(n)) ?? names[0];
  adb('forward', `tcp:${PORT}`, `localabstract:${name}`);
  return { name, all: names };
}

// ── the snapshot, evaluated in the page once a second. It keeps its own cursor (window.__trialSeen) so each call returns
//    only what is new; it changes nothing the piece reads.
function snapshot() {
  const w = window;
  const seen = (w.__trialSeen ??= { ledger: {}, beats: 0, close: 0 });
  const out = { newLedger: {}, newBeats: [], newClose: [] };
  try {
    const L = w.__ledger?.();
    if (L) for (const [k, v] of Object.entries(L)) {
      if (Array.isArray(v)) { const n = seen.ledger[k] ?? 0; if (v.length > n) { out.newLedger[k] = v.slice(n); seen.ledger[k] = v.length; } }
    }
    if (L) out.reachedEras = L.reachedEras;
  } catch (e) { out.ledgerError = String(e); }
  try { const b = w.__os?.e4?.browser?.acts?.beatLog ?? []; if (b.length > seen.beats) { out.newBeats = b.slice(seen.beats); seen.beats = b.length; } } catch { /* not in 2026 */ }
  try { const c = w.__closeLog ?? []; if (c.length > seen.close) { out.newClose = c.slice(seen.close); seen.close = c.length; } } catch { /* not at the Close */ }
  try { out.era = w.__os?.era; out.inDesktop = w.__os?.inDesktop; } catch { /* */ }
  try { const q = w.__graceQueue?.(); const p = q?.phone ?? q; out.phone = p ? { stage: p.stage, screen: p.screen } : null; } catch { /* */ }
  try {
    const a = w.__app;
    out.fps = a?.stats?.frame?.fps ?? null;
    out.ms = a?.stats?.frame?.ms ?? null;
    out.draws = a?.stats?.drawCalls?.total ?? null;
    out.xr = !!a?.xr?.active;
  } catch { /* */ }
  try { out.cam = w.__camPose?.() ?? null; } catch { /* */ }
  // ⚑ S430 (UiB job 39) — the headset's own acts, read-only: the menu's Recentre and the Quest's own (the space's reset), Match my
  //   table (xrComfort's counters), and which A/B the address asks for (?nobatch=1 / ?noseatcull=1, the popping test)
  try { const c = w.__xrComfort?.status?.(); if (c) out.xrc = { recentres: c.recentres ?? null, resets: c.resets ?? null, tables: c.tables ?? null, lift: +(w.__xrComfort.deskLift ?? 0).toFixed(3) }; } catch { /* */ }
  try { const q = new URLSearchParams(location.search); out.ab = q.get('nobatch') === '1' ? 'nobatch' : q.get('noseatcull') === '1' ? 'noseatcull' : 'normal'; } catch { /* */ }
  // ⚑ S432 (UiB job 36, T96) — the hands, read-only: how many controllers (a `tracked-pointer` source with no hand) and hands the
  //   headset has in, and the frame's plate as it stands (`__xrFrame.hintNow()`: the line due or showing; `hintShown()`: the plate up)
  try { const s = [...(w.__app?.xr?.input?.inputSources ?? [])]; out.inputs = { pads: s.filter((x) => !x.hand && x.targetRayMode === 'tracked-pointer').length, hands: s.filter((x) => !!x.hand).length }; } catch { /* */ }
  try { const f = w.__xrFrame; out.hint = (f?.hintNow ?? f?.hintText)?.() ?? null; out.hintUp = f?.hintShown?.()?.text ?? null; } catch { /* */ }
  // ⚑ S435 (UiB job 40 C4) — a balloon of Lamby's / Lambient's up (the guide's own state, read-only): the hands' line waits for it
  try { out.balloon = !!w.__os?.lambyGuide?.active; } catch { /* */ }
  out.url = location.search;
  return out;
}

// ⚑ S357gr (26 Nov, first run with the Quest): puppeteer.connect to the BROWSER endpoint hung on the Quest Browser
//   (no answer at all), while the PAGE's own websocket answers at once. `--direct` (now the default with adb) talks
//   to the page's websocket: Runtime.evaluate for the snapshot, Runtime.consoleAPICalled / exceptionThrown for errors.
const DIRECT = !flag('puppeteer');
async function connectDirect() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const t = list.find((x) => x.type === 'page' && x.url.includes(MATCH));
  if (!t) throw new Error(`no tab with "${MATCH}" in its address (tabs: ${list.map((x) => x.url).join(' · ') || 'none'})`);
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('page websocket failed')); setTimeout(() => rej(new Error('page websocket timeout')), 8000); });
  let id = 0; const waiting = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(String(m.data));
    if (d.id && waiting.has(d.id)) { waiting.get(d.id)(d); waiting.delete(d.id); return; }
    if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(d.params.type)) {
      log({ kind: 'console', level: d.params.type, text: d.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 500) });
    } else if (d.method === 'Runtime.exceptionThrown') {
      log({ kind: 'pageerror', text: String(d.params.exceptionDetails?.exception?.description ?? d.params.exceptionDetails?.text).slice(0, 500) });
    }
  };
  let closed = false; ws.onclose = () => { closed = true; };
  const send = (method, params = {}) => new Promise((res, rej) => {
    if (closed) return rej(new Error('page websocket closed'));
    const n = ++id; waiting.set(n, res); ws.send(JSON.stringify({ id: n, method, params }));
    setTimeout(() => { if (waiting.has(n)) { waiting.delete(n); rej(new Error('evaluate timeout')); } }, 15000);
  });
  await send('Runtime.enable');
  const page = {
    url: () => t.url,
    evaluate: async (fn) => {
      const r = await send('Runtime.evaluate', { expression: `(${fn.toString()})()`, returnByValue: true });
      if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text);
      return r.result?.result?.value;
    },
  };
  return { browser: { disconnect: async () => { try { ws.close(); } catch { /* */ } } }, page };
}

async function connect() {
  if (DIRECT) return connectDirect();
  const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${PORT}`, defaultViewport: null, protocolTimeout: 15000 });
  const pages = await browser.pages();
  const page = pages.find((p) => p.url().includes(MATCH)) ?? null;
  if (!page) throw new Error(`no tab with "${MATCH}" in its address (tabs: ${pages.map((p) => p.url()).join(' · ') || 'none'})`);
  page.on('console', (m) => { if (['error', 'warning', 'warn'].includes(m.type())) log({ kind: 'console', level: m.type(), text: m.text().slice(0, 500) }); });
  page.on('pageerror', (e) => log({ kind: 'pageerror', text: String(e).slice(0, 500) }));
  return { browser, page };
}

function grabFrames(device) {
  const s = stamp();
  if ((FRAMES === 'adb' || FRAMES === 'both') && device) {
    const r = spawnSync('adb', ['exec-out', 'screencap', '-p'], { maxBuffer: 64 * 1024 * 1024 });
    if (r.status === 0 && r.stdout?.length > 1000) writeFileSync(join(OUT, 'frames', `${s}.png`), r.stdout);
    else log({ kind: 'frame-fail', src: 'adb', status: r.status, err: String(r.stderr ?? '').slice(0, 200) });
  }
  if (FRAMES === 'screen' || FRAMES === 'both') spawnSync('screencapture', ['-x', join(OUT, 'screen', `${s}.png`)]);
}

async function main() {
  let device = null;
  if (!NO_ADB) {
    device = adbDevice();
    if (!device) { say('No Quest on the cable (adb devices is empty). Plug it in, allow USB debugging in the headset, run again.'); process.exit(2); }
    const fw = forwardDevtools();
    say(`Quest ${device}: DevTools socket ${fw.name} → localhost:${PORT}`);
  }
  log({ kind: 'start', device, every: EVERY, frames: FRAMES, port: PORT });
  let conn = null, lastStatus = 0, lastFrame = 0, polls = 0, fails = 0, peak = { draws: 0, minFps: Infinity };
  const stopFile = join(OUT, 'stop');
  let stopping = false;
  process.on('SIGINT', () => { stopping = true; });
  while (!stopping && !existsSync(stopFile)) {
    const now = Date.now();
    if (now - lastFrame >= EVERY * 1000) { lastFrame = now; grabFrames(device); }
    try {
      if (!conn) { conn = await connect(); say(`watching ${conn.page.url()}`); log({ kind: 'connected', url: conn.page.url() }); fails = 0; }
      const s = await conn.page.evaluate(snapshot);
      polls++;
      const ev = {};
      if (Object.keys(s.newLedger).length) ev.ledger = s.newLedger;
      if (s.newBeats.length) ev.beats = s.newBeats;
      if (s.newClose.length) ev.close = s.newClose;
      if (Object.keys(ev).length) log({ kind: 'event', ...ev, era: s.era, phone: s.phone });
      const hands = s.inputs ? { ...s.inputs, line: !!HANDS_LINE && s.hint === HANDS_LINE, up: !!HANDS_LINE && s.hintUp === HANDS_LINE, balloon: !!s.balloon } : null;   // S432 · S435: the balloon
      log({ kind: 'tick', era: s.era, phone: s.phone, fps: s.fps, ms: s.ms, draws: s.draws, xr: s.xr, cam: s.cam, xrc: s.xrc, ab: s.ab, hands });
      if (s.draws) peak.draws = Math.max(peak.draws, s.draws);
      if (s.fps && s.xr) peak.minFps = Math.min(peak.minFps, s.fps);
      if (now - lastStatus > 15000) {
        lastStatus = now;
        say(`era ${s.era ?? '?'} · ${s.phone?.stage ?? '-'}/${s.phone?.screen ?? '-'} · ${s.xr ? 'IN VR' : 'not in VR'} · fps ${s.fps ?? '?'} · draws ${s.draws ?? '?'} · ${polls} reads`);
        if (!/debug=1/.test(s.url)) say('⚑ the address has no ?debug=1: the piece hides its log; reload with ?debug=1');
      }
    } catch (e) {
      fails++;
      if (fails === 1 || fails % 15 === 0) { say(`lost the page (${String(e.message ?? e).slice(0, 120)}); retrying`); log({ kind: 'lost', err: String(e.message ?? e).slice(0, 300) }); }
      try { await conn?.browser.disconnect(); } catch { /* */ }
      conn = null;
      if (!NO_ADB && fails % 5 === 0) { try { forwardDevtools(); } catch { /* the socket comes back when the browser does */ } }
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  log({ kind: 'stop', polls, peakDraws: peak.draws, minFpsInVr: Number.isFinite(peak.minFps) ? peak.minFps : null });
  say(`stopped: ${polls} reads; peak draws ${peak.draws}; lowest fps in VR ${Number.isFinite(peak.minFps) ? peak.minFps : '—'}`);
  try { await conn?.browser.disconnect(); } catch { /* */ }
  process.exit(0);
}
main().catch((e) => { say(`failed: ${e.message ?? e}`); process.exit(1); });
