#!/usr/bin/env node
/**
 * ⚑ S418 (UiB job 34 Part B) — 2026'S SCREEN AT EVERY BEAT, CLOSE UP: the monitor's own surface (and, in the Join-in-VR door,
 * the held headset's glass) drawn at 2× straight from the screen's canvas code, at each beat B01…B13. The room views alone are
 * too small to judge the screen; these are what he judges the look by. Grown out of Part A's out/j34-canvas-grab.mjs.
 *
 *     node tools/s418-screens.mjs --port 5581 --out <dir> [--only B01,B04,…] [--monh 384]
 *
 * `?era=4`, then each beat by its debug jump; where a beat needs a press to be reached (Do it for me, her answer, the Yes) the
 * press is the visitor's own, on the monitor's published rect (`__os.e4.pressBrowser`). Each grab waits for the beat's own
 * state (a page, a hit, a flag), so the same script photographs any build that has the jumps (job 33's 7763b962 included).
 * Writes <beat>.png (the monitor, 1420 × 2·monh) and, in the VR door, <beat>_glass.png (the glass, 1024 × 768), and
 * report.json (what each grab waited for, whether it arrived, console errors).
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s418-screens'));
const ONLY = flag('only', '') ? new Set(flag('only', '').split(',')) : null;
const MONH = Number(flag('monh', 384));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

/** each beat: the jump, then steps — ['until', fn-source, ms] waits for the beat's state; ['press', id]; ['wait', ms] */
const A = 'window.__os.e4.browser.acts';
const S = `${A}.screen`;
const HIT = (id) => `window.__os.e4.browser.hits.some((h) => h.id === '${id}')`;
const BEATS = [
  ['B01a', 'e4Act1', [['wait', 3200]]],
  ['B01', 'e4Act1', [['until', HIT('l-catchup'), 40000], ['wait', 1200]]],
  ['B02', 'e4Act1Messages', [['until', `${S}.page?.kind === 'thread' && ${S}.page?.who === 'dad' && !!${S}.page?.told`, 90000], ['wait', 2500]]],
  ['B03', 'e4Act1Mail', [['until', `${S}.page?.kind === 'mail' && ${S}.page?.mail === 'mum'`, 120000], ['wait', 1500]]],
  ['B04', 'e4Act1Search', [['until', HIT('st-add'), 60000], ['wait', 2500]]],
  ['B05', 'e4Act2', [['until', `${S}.page?.kind === 'added'`, 60000], ['wait', 4500]]],
  ['B06a', 'e4Act2Review', [['until', HIT('rv-all'), 60000], ['wait', 600]]],
  ['B06', 'e4Act2Review', [['until', HIT('rv-all'), 60000], ['press', 'rv-all'], ['until', `${S}.page?.kind === 'kettle' && (${S}.page?.muted ?? []).length >= 2`, 90000], ['wait', 2600]]],
  ['B06b', 'e4Act2Review', [['until', HIT('rv-all'), 60000], ['press', 'rv-all'], ['until', `${S}.page?.kind === 'console'`, 120000], ['wait', 2500]]],
  ['B07', 'e4Act2Video', [['until', HIT('video-play'), 60000], ['wait', 1200]]],
  ['B08a', 'e4Act2Answer', [['until', HIT('a2-answer'), 30000], ['wait', 800]]],
  ['B08', 'e4Act2Answer', [['until', HIT('a2-answer'), 30000], ['press', 'a2-answer'], ['until', `${S}.rows.some((r) => r.who === 'unsent')`, 60000], ['wait', 1800]]],
  ['B09a', 'e4Act3', [['until', HIT('a3-vr'), 40000], ['wait', 1200]]],
  ['B09h', 'e4Act3Here', [['until', `${A}.beat === 'photo' && ${A}.shepherd.becoming >= 99 && ${A}.shepherd.booked`, 90000], ['wait', 1500]]],
  ['B09v', 'e4Act3VR', [['until', `${A}.beat === 'photo' && ${A}.shepherd.becoming >= 99 && ${A}.shepherd.booked`, 90000], ['wait', 1500]]],
  ['B09s', 'e4Act3Here', [['until', `${A}.shepherd.hostOn && !!${A}.shepherd.line`, 60000], ['wait', 1500]]],
  ['B10h', 'e4Act3Friends', [['until', `${A}.shepherd.ask`, 90000], ['wait', 1800]]],
  ['B10v', 'e4Act3FriendsVR', [['until', `${A}.shepherd.ask`, 90000], ['wait', 1800]]],
  ['B10f', 'e4Act3Friends', [['until', HIT('a3-yes'), 90000], ['press', 'a3-yes'], ['until', `!!${S}.desk?.peel`, 30000]]],
  ['B10r', 'e4Act3Friends', [['until', HIT('a3-yes'), 90000], ['press', 'a3-yes'], ['until', `${S}.page?.kind === 'junie' && !!${S}.page?.answered`, 60000], ['wait', 1200]]],
  ['B11', 'e4Act4Stream', [['until', `${A}.stream.on`, 60000], ['wait', 6000]]],
  ['B12', 'e4Act4Shutdown', [['until', `${A}.stream.terminated`, 90000], ['wait', 1500]]],
  ['B13', 'e4Act4End', [['until', `!!${A}.stream.lWords`, 90000], ['wait', 4000]]]
];

const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 180000,
  protocolTimeout: 600000, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required', '--disable-audio-output'] });
const report = {};
for (const [name, jump, steps] of BEATS) {
  if (ONLY && !ONLY.has(name)) continue;
  const p = await browser.newPage(); await p.setViewport({ width: 1280, height: 720 });
  const errors = []; p.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  await p.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=4&debug=1&descent=0&home=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await p.waitForFunction(() => window.__app && window.__os && window.__os.e4, { timeout: 180000 });
  await wait(4000);
  await p.evaluate((j) => window.__os.debugJump(j), jump);
  const log = [];
  for (const [kind, a, ms] of steps) {
    if (kind === 'wait') { await wait(a); continue; }
    if (kind === 'press') {
      const ok = await p.evaluate((id) => { const b = window.__os.e4.browser; const h = b.hits.find((r) => r.id === id); return h ? window.__os.e4.pressBrowser(h.x + h.w / 2, h.y + h.h / 2) : false; }, a);
      log.push(`press ${a}: ${!!ok}`); await wait(300); continue;
    }
    const ok = await p.waitForFunction(a, { timeout: ms ?? 60000, polling: 200 }).then(() => true).catch(() => false);
    log.push(`until ${a.slice(0, 90)}: ${ok}`);
  }
  const shots = await p.evaluate((H) => {
    const sh = window.__os.e4, W = 710;
    const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2; const x = c.getContext('2d'); x.scale(2, 2);
    sh.drawBrowser(x, W, H);
    const out = { monitor: c.toDataURL('image/png') };
    const acts = sh.browser.acts, s = acts.shepherd;
    if (s && s.on && s.door === 'vr') {
      const g = document.createElement('canvas'); g.width = 1024; g.height = 768; const y = g.getContext('2d'); y.scale(2, 2);
      s.draw(y, { x: 0, y: 0, w: 512, h: 384 }, null);
      out.glass = g.toDataURL('image/png');
    }
    out.beat = acts.beat; out.skin = acts.screen.desk?.skin ?? null;
    return out;
  }, MONH);
  fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(shots.monitor.split(',')[1], 'base64'));
  if (shots.glass) fs.writeFileSync(path.join(OUT, `${name}_glass.png`), Buffer.from(shots.glass.split(',')[1], 'base64'));
  report[name] = { jump, beat: shots.beat, skin: shots.skin, glass: !!shots.glass, log, errors: errors.slice(0, 4) };
  console.log(`${name} (${jump}) beat ${shots.beat} skin ${shots.skin} glass ${!!shots.glass} · ${log.join(' · ')} · errors ${errors.length}`);
  await p.close();
}
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
await browser.close();
