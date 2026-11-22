#!/usr/bin/env node
/**
 * ⚑ S417 (UiB job 34 Part A) — 2026's DESKTOP AND ITS MENU, PHOTOGRAPHED: the frames tools/s412-act1-probe.mjs does not take.
 *
 *     node tools/s417-stills.mjs --port 5571 --out <dir> [--modes computer,headset] [--only menu,act2,act3here,act3vr,stream]
 *
 * `?era=4`, then each moment by its debug jump, the same on any build (job 33's "before" has no Menu: its frame shows that):
 *   M01  the Menu open at beat 1's two answers (the button pressed by its published rect, as a visitor's press lands)
 *   M02  the Menu closed again: the answers live (the director held while it was open)
 *   A2   Act II, the takeover running (Second Thoughts' banner, the lot muted)
 *   A3H  Act III, Join here: Shepherd Live™ on the desktop, the photo being altered
 *   A3V  Act III, Join in VR: the monitor's still card (computer); in the headset, the session on the glass
 *   A4   the stream over the whole glass
 * Writes <name>_desktop.png / <name>_xr.png and report.json (draw calls per frame, the Menu's items, console errors).
 * The headset is s412's seated mock (xr.active forced, the head at the rig, a 90° view).
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s417-stills'));
const MODES = flag('modes', 'computer,headset').split(',');
const ONLY = new Set(flag('only', 'menu,act2,act3here,act3vr,stream').split(','));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 180000,
  protocolTimeout: 600000, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required', '--disable-audio-output'] });
const VIEW = { computer: { width: 1280, height: 720, deviceScaleFactor: 1 }, headset: { width: 1000, height: 1000, deviceScaleFactor: 1 } };
const report = {};

const open = async (mode) => {
  const page = await browser.newPage();
  await page.setViewport(VIEW[mode]);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 240)); });
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=4&debug=1&descent=0&home=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__app && window.__os && window.__os.e4 && window.__camFree, { timeout: 180000 });
  await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
  await wait(5000);
  if (mode === 'headset') {
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      app.xr.input.fire('add', src); app.xr.input.fire('select', src);
      app.on('update', () => { const d = app.root.findByName('xr-debug'); if (d) d.enabled = false; });
    });
    await wait(2500);
  } else {
    await page.evaluate(() => window.__camFree(4.6, 1.16, 0.70, -8, 270));
    await wait(1500);
  }
  return { page, errors };
};
const hits = (page) => page.evaluate(() => window.__os.e4.browser.hits.map((h) => h.id));
const press = (page, id) => page.evaluate((id) => { const b = window.__os.e4.browser; const h = b.hits.find((r) => r.id === id); return h ? window.__os.e4.pressBrowser(h.x + h.w / 2, h.y + h.h / 2) : false; }, id);
const until = async (page, fn, arg, ms = 90000) => page.waitForFunction(fn, { timeout: ms }, arg).then(() => true).catch(() => false);
const shot = async (page, mode, name) => {
  await wait(400);
  await page.screenshot({ path: path.join(OUT, `${name}_${mode === 'computer' ? 'desktop' : 'xr'}.png`) });
  const d = await page.evaluate(() => ({ draws: window.__drawCalls ?? null, beat: window.__os.e4.browser.acts.beat }));
  (report[mode] ??= {})[name] = d;
  console.log(`${mode} ${name} · beat ${d.beat} · draws ${d.draws}`);
};

for (const mode of MODES) {
  if (ONLY.has('menu')) {
    const { page, errors } = await open(mode);
    await page.evaluate(() => window.__os.debugJump('e4Act1'));
    await until(page, () => window.__os.e4.browser.hits.some((h) => h.id === 'l-catchup'));
    await wait(800);
    const opened = await press(page, 'start-menu');
    await wait(900);
    const items = (await hits(page)).filter((id) => /^sm-/.test(id));
    const beatThen = await page.evaluate(() => window.__os.e4.browser.acts.t);
    await shot(page, mode, 'M01');
    await wait(3000);
    const held = await page.evaluate((t) => Math.abs(window.__os.e4.browser.acts.t - t) < 0.05, beatThen);
    if (opened) await press(page, 'start-menu');
    await wait(900);
    const back = (await hits(page)).includes('l-catchup');
    await shot(page, mode, 'M02');
    (report[mode] ??= {}).menu = { opened: !!opened, items, heldWhileOpen: held, answersBack: back, errors };
    console.log(`${mode} menu: opened ${!!opened} · ${items.length} items · held ${held} · answers back ${back}`);
    await page.close();
  }
  if (ONLY.has('act2')) {
    const { page, errors } = await open(mode);
    await page.evaluate(() => window.__os.debugJump('e4Act2Review'));
    await until(page, () => window.__os.e4.browser.hits.some((h) => h.id === 'rv-all'));
    await press(page, 'rv-all');
    await until(page, () => window.__os.e4.browser.acts.screen.page?.kind === 'kettle' && !!window.__os.e4.browser.acts.screen.banner, null, 30000);
    await wait(9000);
    await shot(page, mode, 'A2');
    (report[mode] ??= {}).act2errors = errors;
    await page.close();
  }
  if (ONLY.has('act3here')) {
    const { page, errors } = await open(mode);
    await page.evaluate(() => window.__os.debugJump('e4Act3Here'));
    await until(page, () => window.__os.e4.browser.acts.beat === 'photo', null, 60000);
    await wait(9000);
    await shot(page, mode, 'A3H');
    (report[mode] ??= {}).act3hereErrors = errors;
    await page.close();
  }
  if (ONLY.has('act3vr')) {
    const { page, errors } = await open(mode);
    await page.evaluate(() => window.__os.debugJump('e4Act3VR'));
    await until(page, () => window.__os.e4.browser.acts.beat === 'photo', null, 60000);
    await wait(9000);
    await shot(page, mode, 'A3V');
    (report[mode] ??= {}).act3vrErrors = errors;
    await page.close();
  }
  if (ONLY.has('stream')) {
    const { page, errors } = await open(mode);
    await page.evaluate(() => window.__os.debugJump('e4Act4Stream'));
    await until(page, () => window.__os.e4.browser.acts.stream?.on, null, 60000);
    await wait(14000);
    await shot(page, mode, 'A4');
    (report[mode] ??= {}).streamErrors = errors;
    await page.close();
  }
}
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
await browser.close();
