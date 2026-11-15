#!/usr/bin/env node
/**
 * ⚑ S394 fix (his "FIX first": the 2026 margin line ran off the foot of the Lamby set's bar) — EVERY CAPTION AND EVERY
 * MARGIN LINE OF ALL THREE TAPES, DRAWN INTO THE BAR, IN THREE LOOK-MODES.
 *
 *     node tools/s394-bar-fit-probe.mjs --port 5194 [--out output/s394-fix-proof] [--mode desktop|xr|phone|all]
 *
 * For each look-mode one page (the computer 1280 × 720; the emulated headset, calibrated; an iPhone 844 × 390 landscape,
 * touch), the fonts loaded, then `__teachingTv.fitAll()` (a review aid) draws every moment of every tape into its set's bar
 * with the piece's own code: each caption cue alone, each margin line alone, each caption shown with a margin line, and v5's
 * break bar with its captions. Checks, per moment: every line's ink inside the bar (left, right, top and foot), the bar inside
 * the glass (never below it, never taller than `bar.maxH`), and every capital at or above the look-mode's floor — 1.0° in the
 * headset, 14 px on the computer, 12 px on the phone (the capital's canvas px × the held glass's degrees or CSS px per canvas
 * px, `readingScale`). Reports the worst case per mode: the tightest moment (least space left), its capitals, the bar's height.
 * Writes <out>/bar-fit-<mode>.json; exit 1 on any failure.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'output/s394-fix-proof'));
const MODE = flag('mode', 'all');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const TVJ = JSON.parse(fs.readFileSync('data/room/teaching_tvs.json', 'utf8'));
const FLOOR = { xr: TVJ.bar.floorDeg, desktop: TVJ.bar.floorPxComputer, phone: TVJ.bar.floorPxPhone };
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required', '--disable-audio-output'] });
let failed = 0, total = 0;
const C = (mode, name, ok, extra = '') => { total++; if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  [${mode}] ${name}${extra ? '  ' + extra : ''}`); };

for (const mode of (MODE === 'all' ? ['desktop', 'xr', 'phone'] : [MODE])) {
  const xr = mode === 'xr', phone = mode === 'phone';
  const page = await browser.newPage();
  if (phone) await page.emulate({ userAgent: IPHONE_UA, viewport: { width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: true } });
  else await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?reinterp=1&era=3&debug=1&descent=0&kiosk=0`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.__app && window.__teachingTv && window.__camPose, { timeout: 180000 });
  await wait(5000);
  if (xr) {
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      window.__controller = src; app.xr.input.fire('add', src);
    });
    await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
    await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
  }
  await page.evaluate(() => document.fonts.ready);
  await wait(1500);
  const fit = await page.evaluate(() => window.__teachingTv.fitAll());
  const r = fit.reading, per = r.perCanvas, unit = r.unit === 'deg' ? '°' : ' px';
  const conv = (canvas) => +(canvas * per).toFixed(r.unit === 'deg' ? 2 : 1);
  const report = { mode, reading: r, tapes: {} };
  let worst = null;
  for (const [tape, t] of Object.entries(fit.tapes)) {
    const bad = t.moments.filter((m) => !m.inside);
    const low = t.moments.filter((m) => (m.capCaption && m.capCaption * per < FLOOR[mode] - 0.005) || (m.capMargin && m.capMargin * per < FLOOR[mode] - 0.005));
    C(mode, `${tape}: every caption and margin line inside the bar, the bar inside the glass (${t.moments.length} moments, bar ${t.barH} of 720 canvas px)`, bad.length === 0, bad.slice(0, 3).map((m) => m.key).join(' | '));
    C(mode, `${tape}: every capital at or above the floor (${FLOOR[mode]}${unit})`, low.length === 0, low.slice(0, 3).map((m) => `${m.key} (${conv(m.capCaption)}/${conv(m.capMargin)})`).join(' | '));
    const tight = t.moments.reduce((a, m) => (!a || m.left < a.left ? m : a), null);
    const minCap = Math.min(...t.moments.flatMap((m) => [m.capCaption, m.capMargin].filter((x) => x > 0)));
    report.tapes[tape] = { barH: t.barH, floorCanvas: +t.floor.toFixed(1), moments: t.moments.length, tightest: tight && { key: tight.key, left: tight.left, need: tight.need,
      capCaption: conv(tight.capCaption), capMargin: conv(tight.capMargin), lines: tight.lines }, smallestCapital: conv(minCap) };
    if (tight && (!worst || tight.left < worst.left)) worst = { tape, ...report.tapes[tape].tightest };
  }
  report.worst = worst;
  console.log(`  worst [${mode}]: ${JSON.stringify(worst)}`);
  console.log(`  smallest capitals [${mode}]: ${Object.entries(report.tapes).map(([t, v]) => `${t} ${v.smallestCapital}${unit} (bar ${v.barH})`).join(', ')}`);
  fs.writeFileSync(path.join(OUT, `bar-fit-${mode}.json`), JSON.stringify(report, null, 1));
  await page.close();
}
await browser.close();
console.log(`\n${total - failed}/${total} checks passed`);
process.exit(failed ? 1 : 0);
