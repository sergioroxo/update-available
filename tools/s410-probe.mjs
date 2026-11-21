#!/usr/bin/env node
/**
 * ⚑ S410 (UiB job 32 follow-up) — his 21 Nov answers, before and after, on one build per run.
 *
 *     node tools/s410-probe.mjs --port 5493 --label after [--out <dir>]
 *
 *  1 · the IRC blip (irc_pop_1997): heard headless (Chrome --autoplay-policy, `window.Audio` wrapped). Counts the blips
 *      while the room's channel lines arrive (12 s after joining), then while Rob's private lines arrive (the request
 *      accepted). S406 blipped on both; S410 only on Rob's.
 *  5 · Release Work (97-21): the exercise's steps 2, 7 and 11 as the screen shows them (`5-cycle…`), the prompt beside it.
 *  4 · the file items of 2003, 2016 and 2026: a filing made into the era's own ledger list, the screen caught 0.4 s after
 *      (inside the 1.6 s a filing used to light it): `4-2003`, `4-2016`, `4-2026`. The count still rises; nothing lights.
 * Writes <label>-1-irc.png, <label>-4-<year>.png and <label>-report.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const LABEL = flag('label', 'probe');
const OUT = path.resolve(flag('out', 'out/s410'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 180000,
  args: ['--no-sandbox', '--use-gl=angle', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 } });
const WRAP = () => {
  const O = window.Audio; window.__auds = [];
  window.Audio = function (...a) { const el = new O(...a); window.__auds.push(el); return el; };
  window.Audio.prototype = O.prototype;
};
const report = { label: LABEL, port: PORT, errors: [] };
const save = (url, file) => fs.writeFileSync(path.join(OUT, `${LABEL}-${file}`), Buffer.from(url.split(',')[1], 'base64'));
async function boot(query) {
  const page = await browser.newPage(); await page.evaluateOnNewDocument(WRAP);
  page.on('pageerror', (e) => report.errors.push(`${query}: ${String(e).slice(0, 200)}`));
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&${query}&debug=1&descent=0&home=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__app && window.__os, { timeout: 180000 });
  await wait(5000);
  return page;
}
const pops = (page) => page.evaluate(() => window.__auds.filter((a) => (a.src || '').includes('irc_pop_1997')).length);

// ── 1 · the IRC blip ──
{
  // the route tools/s406-sound-probe.mjs takes to the channel: the real entrance (Log in), the descent, the desktop
  const page = await browser.newPage(); await page.evaluateOnNewDocument(WRAP);
  page.on('pageerror', (e) => report.errors.push(`irc: ${String(e).slice(0, 200)}`));
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&debug=1&home=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 90000 }).catch(() => {});
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
  await page.waitForFunction(() => window.__app && window.__os && window.__camPose, { timeout: 180000 });
  await wait(5000);
  for (let i = 0; i < 40; i++) { const p = await page.evaluate(() => window.__camPose()); if (!p.driven && !p.descent) break; await wait(1000); }
  await page.evaluate(() => window.__os.debugJump('desktop')); await wait(2500);
  // online first (the kit's Connect makes the browser and the channel's Join), then the channel joined
  await page.evaluate(() => { const os = window.__os; os.insertKit(); if (!os.web && os.kit?.onConnect) os.kit.onConnect(); os.joinChannel(); }); await wait(12000);
  const channel = await pops(page);
  save(await page.evaluate(() => window.__os.canvas.toDataURL()), '1-irc-channel.png');
  await page.evaluate(() => { const irc = window.__os.irc; irc.chanReplied = true; irc.acceptRequest(); window.__os.dirty = true; });
  await wait(12000);
  const rob = (await pops(page)) - channel;
  save(await page.evaluate(() => window.__os.canvas.toDataURL()), '1-irc-rob.png');
  report.irc = { blipsWhileTheChannelSpeaks: channel, blipsWhileRobWrites: rob };
  await page.close();
}

// ── 4 · the file items, a filing caught while it would have been lit ──
const file = async (page, list, row) => page.evaluate(async (list, row) => {
  const L = (await import('/src/state/ledger.ts')).ledger; L[list].push(row); window.__os.dirty = true;
}, list, row);
{
  const page = await boot('era=2');
  await wait(9000);
  await page.evaluate(() => { const os = window.__os; if (os.restorify) os.restorify.open = false; os.checkinForced = false; os.eveningCheckin = 'done'; os.dirty = true; });
  await wait(2500);
  const n0 = await page.evaluate(() => window.__os.fileWatch.count);
  await file(page, 'media', { id: 's410-probe', outcome: 'filed', witness: 'a filing (S410 probe)' });
  await wait(400);
  save(await page.evaluate(() => window.__os.canvas.toDataURL()), '4-2003.png');
  report.e2003 = { before: n0, after: await page.evaluate(() => window.__os.fileWatch.count), litState: await page.evaluate(() => window.__os.fileWatch.on) };
  await page.close();
}
{
  const page = await boot('era=3');
  for (let i = 0; i < 12; i++) {
    const done = await page.evaluate(() => {
      const q = window.__graceQueue(); const r = (q.rects ?? []).find((h) => h.id === 'signin' || h.id === 'consent-allow');
      if (!r) return !['dark', 'boot', 'install', 'signin', 'consent'].includes(q.mode);
      q.handleClick(r.x + r.w / 2, r.y + r.h / 2); return false;
    });
    if (done) break;
    await wait(1500);
  }
  await wait(2000);
  await file(page, 'era3Jobs', { id: 's410-probe', witness: 'a filing (S410 probe)' });
  await wait(400);
  save(await page.evaluate(() => { const q = window.__graceQueue(); const c = document.createElement('canvas'); c.width = 676; c.height = 390; q.draw(c.getContext('2d'), c.width, c.height); return c.toDataURL(); }), '4-2016.png');
  report.e2016 = { shot: true };
  await page.close();
}
{
  const page = await boot('era=4');
  // the browser landed open (the review route's own jumps), where the taskbar carries the Memory item
  await page.evaluate(() => { const os = window.__os; os.debugJump('e4Browser'); }); await wait(3000);
  await page.evaluate(() => { const os = window.__os; os.e4?.browser?.debugFinishProgram?.(); os.dirty = true; }); await wait(3000);
  await file(page, 'e4Space', { id: 'session', outcome: 'filed', witness: 'a filing (S410 probe)' });
  await wait(400);
  // the browser's own surface (the monitor's, E4Shell.drawBrowser), drawn as the monitor draws it
  save(await page.evaluate(() => { const os = window.__os, W = os.canvas.width, H = os.canvas.height; const c = document.createElement('canvas'); c.width = W; c.height = H; os.e4.drawBrowser(c.getContext('2d'), W, H); return c.toDataURL(); }), '4-2026.png');
  report.e2026phase = await page.evaluate(() => window.__os.e4?.browser?.phase ?? null);
  report.e2026 = { shot: true };
  await page.close();
}
// ── 5 · Release Work's steps (97-21): the exercise opened on the 1997 desktop, three of its steps as the screen shows them ──
{
  const page = await boot('reveal=1');
  await page.evaluate(() => window.__os.debugJump('desktop')); await wait(2500);
  const shots = [[1, 'cycle1-exhale'], [6, 'cycle2-strike'], [10, 'cycle3-strike']];
  report.releaseWork = [];
  for (const [i, name] of shots) {
    const prompt = await page.evaluate(async (i) => {
      const os = window.__os; const data = (await import('/data/provotypes/pillow.json')).default;
      if (!os.provotype) os.openProvotype(data);
      const p = os.provotype; p.phase = 'vignette'; p.enterState(i); p.dirty = true; os.dirty = true;
      return data.states[i].prompt;
    }, i);
    await wait(1500);
    save(await page.evaluate(() => { window.__os.draw(); return window.__os.canvas.toDataURL(); }), `5-${name}.png`);
    report.releaseWork.push({ state: i, name, prompt });
  }
  await page.close();
}
fs.writeFileSync(path.join(OUT, `${LABEL}-report.json`), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report));
await browser.close();
