#!/usr/bin/env node
/**
 * ⚑ S420 (UiB job 34) — HER PHOTO UNDER THE FILTER, AND WHAT IT WANTS HER TO BECOME, PHOTOGRAPHED: every surface of the
 * visit that shows the picture, on any build that has job 33's debug jumps (so the same script takes the "before" and the
 * "after").
 *
 *     node tools/s420-picture-stills.mjs --port 5611 --out <dir> [--only close,rooms,console] [--modes computer,headset]
 *                                         [--doors here,vr]
 *
 *   close    Shepherd's photo at steps 0, 3, 6, 9, 12 and 14 (99%), drawn straight from the screen's canvas code at 2×: the
 *            monitor in Join here (`photo-here-sNN.png`, 1420 × 768) and the glass in Join in VR (`photo-vr-sNN.png`,
 *            1024 × 768). `?era=4`, the debug jump, then — once the photo has run to 99 with its notes in — each step set and
 *            drawn in one synchronous call (the session's `photoTo`), and set back; the director never sees it.
 *   rooms    the same moment from the seat, as the visitor sees it (`B09-photo-<door>-<pct>_<desktop|xr>.png`), at 21, 42,
 *            64, 85 and 99% as the filter reaches them on its own clock; the headset is the seated mock (xr.active forced,
 *            the head at the rig, a 90° view).
 *   console  beat 6's console (MATCH MADE SIMPLE's Pride '24 picture under the same filter): the page on the monitor
 *            (`console-page.png`, close-up), the game's own screen at its title and after PLAY (`console-game[-play].png`,
 *            960 × 540), and from the seat the page, the console brought to the eye by its Open it, and PLAY tapped on it
 *            (`B06-console[-held|-play]_<desktop|xr>.png`).
 * Writes report.json (what each grab waited for, whether it arrived, the step and percentage drawn, console errors).
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s420-stills'));
const ONLY = new Set(flag('only', 'close,rooms,console').split(','));
const MODES = flag('modes', 'computer,headset').split(',');
const DOORS = flag('doors', 'here,vr').split(',');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 180000,
  protocolTimeout: 600000, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required', '--disable-audio-output'] });
const VIEW = { computer: { width: 1280, height: 720, deviceScaleFactor: 1 }, headset: { width: 1000, height: 1000, deviceScaleFactor: 1 }, canvas: { width: 1280, height: 720, deviceScaleFactor: 1 } };
const report = { port: PORT, close: {}, rooms: {}, console: {} };
const save = (name, dataUrl) => fs.writeFileSync(path.join(OUT, name), Buffer.from(dataUrl.split(',')[1], 'base64'));

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
  } else if (mode === 'computer') {
    await page.evaluate(() => window.__camFree(4.6, 1.16, 0.70, -8, 270));
    await wait(1500);
  }
  return { page, errors };
};
const until = (page, src, ms) => page.waitForFunction(src, { timeout: ms, polling: 150 }).then(() => true).catch(() => false);
const press = (page, id) => page.evaluate((id) => { const b = window.__os.e4.browser; const h = b.hits.find((r) => r.id === id); return h ? window.__os.e4.pressBrowser(h.x + h.w / 2, h.y + h.h / 2) : false; }, id);
const A = 'window.__os.e4.browser.acts';
/** the debug jump, once more if it did not take (a loaded machine can run it before the era is ready) */
const jump = async (page, j) => {
  for (let i = 0; i < 3; i++) {
    await page.evaluate((j) => { try { window.__os.debugJump(j); } catch (e) { console.error('jump ' + e); } }, j);
    if (await until(page, `window.__os.e4.browser.storyStep === 'acts'`, 20000)) return true;
    await wait(3000);
  }
  return false;
};
const PHOTO_DONE = `${A}.beat === 'photo' && ${A}.shepherd.photos === 2 && ${A}.shepherd.becoming >= 99 && ${A}.shepherd.booked`;

// ── close: the photo, step by step, from the canvas code ─────────────────────────────────────────────────────────────
if (ONLY.has('close')) for (const door of DOORS) {
  const { page, errors } = await open('canvas');
  await jump(page, door === 'vr' ? 'e4Act3VR' : 'e4Act3Here');
  const ok = await until(page, PHOTO_DONE, 120000);
  const shots = await page.evaluate((door) => {
    const e4 = window.__os.e4, s = e4.browser.acts.shepherd, out = [];
    const was = 14;
    for (const k of [0, 3, 6, 9, 12, 14]) {
      s.photoTo(k);
      let url;
      if (door === 'vr') {
        const g = document.createElement('canvas'); g.width = 1024; g.height = 768; const y = g.getContext('2d'); y.scale(2, 2);
        s.draw(y, { x: 0, y: 0, w: 512, h: 384 }, null); url = g.toDataURL('image/png');
      } else {
        const c = document.createElement('canvas'); c.width = 1420; c.height = 768; const x = c.getContext('2d'); x.scale(2, 2);
        e4.drawBrowser(x, 710, 384); url = c.toDataURL('image/png');
      }
      out.push({ k, becoming: s.becoming, url });
    }
    s.photoTo(was);
    return out;
  }, door);
  for (const sh of shots) save(`photo-${door}-s${String(sh.k).padStart(2, '0')}.png`, sh.url);
  report.close[door] = { arrived: ok, steps: shots.map((s) => `${s.k}:${s.becoming}%`), errors: errors.slice(0, 4) };
  console.log(`close ${door}: arrived ${ok} · ${report.close[door].steps.join(' ')} · errors ${errors.length}`);
  await page.close();
}

// ── rooms: the photo from the seat, on its own clock ─────────────────────────────────────────────────────────────────
if (ONLY.has('rooms')) for (const mode of MODES) for (const door of DOORS) {
  const { page, errors } = await open(mode);
  const sfx = mode === 'computer' ? 'desktop' : 'xr';
  await jump(page, door === 'vr' ? 'e4Act3VR' : 'e4Act3Here');
  const got = [];
  for (const pct of [21, 42, 64, 85, 99]) {
    const cond = pct === 99 ? PHOTO_DONE : `${A}.beat === 'photo' && ${A}.shepherd.photos === 2 && ${A}.shepherd.becoming >= ${pct}`;
    const ok = await until(page, cond, 120000);
    if (pct === 99) await wait(800);
    await page.screenshot({ path: path.join(OUT, `B09-photo-${door}-${pct}_${sfx}.png`) });
    const at = await page.evaluate(() => ({ b: window.__os.e4.browser.acts.shepherd.becoming, draws: window.__drawCalls ?? null }));
    got.push(`${pct}:${ok ? at.b : 'missed'}%·${at.draws}dc`);
  }
  report.rooms[`${mode}-${door}`] = { got, errors: errors.slice(0, 4) };
  console.log(`rooms ${mode} ${door}: ${got.join(' ')} · errors ${errors.length}`);
  await page.close();
}

/** PLAY on the console, as her taps on its glass land: until the game leaves its title (a title only arms after it has
 *  ticked a moment, and on the bed it ticks only after a tap) */
const playConsole = async (page) => {
  for (let i = 0; i < 5; i++) {
    const st = await page.evaluate(async () => { const m = await import('/src/room/consoleSession.ts'); const cs = m.consoleSession; const s0 = cs.probe()?.s.state ?? 'none'; if (s0 === 'title' || s0 === 'none') cs.tap(0.5, 0.765); return s0; });
    if (st !== 'title' && st !== 'none') { await wait(1500); return st; }
    await wait(2200);
  }
  return 'title';
};
// ── console: beat 6's page, the game's own screen, and the console held ──────────────────────────────────────────────
if (ONLY.has('console')) for (const mode of [...new Set(['canvas', ...MODES])]) {
  const { page, errors } = await open(mode);
  await jump(page, 'e4Act2Review');
  await until(page, `window.__os.e4.browser.hits.some((h) => h.id === 'rv-all')`, 60000);
  await press(page, 'rv-all');
  const ok = await until(page, `${A}.screen.page?.kind === 'console' && ${A}.screen.chips.some((c) => c.id === 'a2-open')`, 150000);
  await wait(1200);
  const rec = { arrived: ok };
  if (mode === 'canvas') {
    const urls = await page.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 1420; c.height = 768; const x = c.getContext('2d'); x.scale(2, 2);
      window.__os.e4.drawBrowser(x, 710, 384);
      const out = { page: c.toDataURL('image/png') };
      try {
        const m = await import('/src/room/consoleSession.ts');
        const cs = m.consoleSession;
        if (cs.ready) { const g = document.createElement('canvas'); g.width = 960; g.height = 540; cs.draw(g.getContext('2d'), 0, 0, 960, 540); out.game = g.toDataURL('image/png'); out.progress = cs.progress; }
      } catch (e) { out.err = String(e).slice(0, 200); }
      return out;
    });
    save('console-page.png', urls.page);
    if (urls.game) save('console-game.png', urls.game);
    // the game's picture: PLAY pressed, as a tap on its glass lands (the picture is under the filter at the chat's ring)
    //   (on the bed it ticks only after a tap: the first wakes its title, the second, once the title is armed, is PLAY)
    await playConsole(page);
    const play = await page.evaluate(async () => {
      const m = await import('/src/room/consoleSession.ts'), cs = m.consoleSession;
      const g = document.createElement('canvas'); g.width = 960; g.height = 540; cs.draw(g.getContext('2d'), 0, 0, 960, 540);
      return { url: g.toDataURL('image/png'), progress: cs.progress };
    });
    save('console-game-play.png', play.url);
    rec.playProgress = play.progress;
    Object.assign(rec, { game: !!urls.game, progress: urls.progress ?? null, err: urls.err ?? null });
  } else {
    const sfx = mode === 'computer' ? 'desktop' : 'xr';
    await page.screenshot({ path: path.join(OUT, `B06-console_${sfx}.png`) });
    rec.pressed = await press(page, 'a2-open');
    rec.held = await until(page, `window.__heldDevices?.held('e4')`, 10000);
    await wait(1800);
    await page.screenshot({ path: path.join(OUT, `B06-console-held_${sfx}.png`) });
    // PLAY, as her tap on the console's glass lands: the game's picture, under the filter
    rec.playing = await playConsole(page);
    await page.screenshot({ path: path.join(OUT, `B06-console-play_${sfx}.png`) });
  }
  rec.errors = errors.slice(0, 4);
  report.console[mode] = rec;
  console.log(`console ${mode}: ${JSON.stringify(rec)}`);
  await page.close();
}

fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
await browser.close();
