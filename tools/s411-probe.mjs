#!/usr/bin/env node
/**
 * ⚑ S411 (UiB job 32 follow-up 2) — 2003's ONE press sound, heard headless (Chrome --autoplay-policy, `window.Audio`
 * wrapped before the page starts; memory "headless-sound-and-default-cut").
 *
 *     node tools/s411-probe.mjs --port 5493 --label after [--out <dir>]
 *
 * On 2003's desktop (`?era=2`, the check-in closed), three kinds of press, each counted by the sounds it makes:
 *   · an icon on the glass (os.handleClick on a published hit);
 *   · the accountability alert's own buttons (alert-next, then alert-ok);
 *   · the update notice's Remind me later (u3, the notice shown on 2003's desktop).
 * After S411 every press makes press_2003 and nothing else (ui_press gone). Writes <label>-report.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const LABEL = flag('label', 'probe');
const OUT = path.resolve(flag('out', 'out/s411'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 180000,
  args: ['--no-sandbox', '--use-gl=angle', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 } });
const report = { label: LABEL, port: PORT, presses: [], errors: [] };
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  const O = window.Audio; window.__auds = [];
  window.Audio = function (...a) { const el = new O(...a); window.__auds.push(el); return el; };
  window.Audio.prototype = O.prototype;
});
page.on('pageerror', (e) => report.errors.push(String(e).slice(0, 200)));
await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=2&debug=1&descent=0&home=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForFunction(() => window.__app && window.__os, { timeout: 180000 });
await wait(14000);
await page.evaluate(() => { const os = window.__os; if (os.restorify) os.restorify.open = false; os.checkinForced = false; os.eveningCheckin = 'done'; os.dirty = true; });
await wait(2500);
/** the sounds made between a mark and now, by file stem */
const mark = () => page.evaluate(() => window.__auds.length);
const since = (n) => page.evaluate((n) => window.__auds.slice(n).map((a) => (a.src || '').split('/').pop().replace('.mp3', '')), n);
const press = async (what, fn, arg) => {
  const n = await mark();
  const ok = await page.evaluate(fn, arg);
  await wait(500);
  const sounds = await since(n);
  report.presses.push({ what, ok, sounds, clicks: sounds.filter((s) => /press|click/.test(s)) });
};
// the review route opens on the Word of the Day: its OK is the first press on the glass
await press('the Word of the Day: OK', () => { const os = window.__os; const h = (os.hits ?? [])[0]; if (!h) return null; os.handleClick(h.x + h.w / 2, h.y + h.h / 2); return h.id; });
await wait(1200);
// the accountability alert (2003's, the network list run): Next, then its last button
await page.evaluate(() => { const os = window.__os; os.openAccountabilityAlert(); os.dirty = true; }); await wait(2500);
for (const ids of [['alert-next'], ['alert-ok', 'alert-dismiss']]) {
  for (let i = 0; i < 60; i++) { const up = await page.evaluate((ids) => (window.__os.accountability?.hits ?? []).some((k) => ids.includes(k.id)), ids); if (up) break; await wait(500); }
  await press(`the accountability alert: ${ids.join(' or ')}`, (ids) => { const os = window.__os; const h = (os.accountability?.hits ?? []).find((k) => ids.includes(k.id)); if (!h) return null; os.handleClick(h.x + h.w / 2, h.y + h.h / 2); return h.id; }, ids);
  await wait(1500);
}
await press('an icon on the 2003 glass', () => { const os = window.__os; const h = (os.hits ?? []).find((k) => k.id.startsWith('icon-')); if (!h) return null; os.handleClick(h.x + h.w / 2, h.y + h.h / 2); return h.id; });
await wait(800);
await page.evaluate(() => { window.__os.debugJump('update3'); }); await wait(3000);
await press('the update notice (u3): remind-later', () => { const os = window.__os; const u = os.updateApp; const h = [...(u?.hits ?? []), ...(os.hits ?? [])].find((k) => k.id === 'remind-later'); if (!h) return null; os.handleClick(h.x + h.w / 2, h.y + h.h / 2); return 'remind-later'; });
fs.writeFileSync(path.join(OUT, `${LABEL}-report.json`), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report));
await browser.close();
