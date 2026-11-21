#!/usr/bin/env node
/**
 * ⚑ S406 (UiB job 32 Part A, H5) — THE THREE NEW SOUNDS, HEARD HEADLESS. Memory "rendered-audio-needs-registering": a file
 * on disk plays nothing until its name is in tapeAudio.ts's REGISTRY, and nothing complains. So each is proved by playing:
 * Chrome with --autoplay-policy=no-user-gesture-required, `window.Audio` wrapped before the page starts (memory
 * "headless-sound-and-default-cut"), and for each sound: an element made for its file, no error, a decoded duration, and a
 * currentTime that ADVANCES.
 *   · press_1997     — 1997's desktop, a real mouse press on the monitor (projected from a published hit)
 *   · irc_pop_1997   — 1997, the channel joined: the room's lines arriving
 *   · net_try_2003 / net_fail_2003 — 2003, the accountability alert's network list running (its own entry)
 *
 *     node tools/s406-sound-probe.mjs --port 5461 [--out out/s406-sound]
 * Exit 1 if any of the four is not heard.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s406-sound'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 } });
const WRAP = () => {
  const O = window.Audio; window.__auds = [];
  window.Audio = function (...a) { const el = new O(...a); window.__auds.push(el); return el; };
  window.Audio.prototype = O.prototype;
};
/** every element for `file`: did it load, did it play, how far */
const heard = (page, file) => page.evaluate(async (file) => {
  const els = window.__auds.filter((a) => (a.src || '').includes(file));
  const t0 = els.map((a) => a.currentTime);
  await new Promise((r) => setTimeout(r, 120));
  return { file, made: els.length, errors: els.filter((a) => a.error).length, duration: Math.max(0, ...els.map((a) => (Number.isFinite(a.duration) ? a.duration : 0))),
    played: els.some((a, i) => a.currentTime > 0 || a.ended || a.currentTime > t0[i]), volume: els.map((a) => +a.volume.toFixed(2)) };
}, file);
const results = [];

// ── 1997: the press, and the channel ──
{
  const page = await browser.newPage(); await page.evaluateOnNewDocument(WRAP);
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&debug=1&home=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 90000 }).catch(() => {});
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
  await page.waitForFunction(() => window.__app && window.__os && window.__camPose, { timeout: 180000 });
  await wait(5000);
  for (let i = 0; i < 40; i++) { const p = await page.evaluate(() => window.__camPose()); if (!p.driven && !p.descent) break; await wait(1000); }
  await page.evaluate(() => window.__os.debugJump('desktop')); await wait(2500);
  // a real press on the glass: the centre of the first published icon, projected through the live camera
  const at = await page.evaluate(() => {
    const app = window.__app, os = window.__os, cam = app.root.findByName('camera');
    const h = (os.hits ?? []).find((k) => k.id.startsWith('icon-')) ?? (os.hits ?? [])[0]; if (!h) return null;
    const e = app.root.findByName('desktop-screen') ?? app.root.findByName('monitor-screen');
    if (!e) return null;
    const V = e.getPosition().constructor, w = e.getWorldTransform().transformPoint(new V((h.x + h.w / 2) / 512 - 0.5, 0, (h.y + h.h / 2) / 384 - 0.5));
    const s = cam.camera.worldToScreen(w); return { x: s.x, y: s.y, id: h.id };
  });
  if (at) { await page.mouse.click(at.x, at.y); } else await page.evaluate(() => window.__os.handleClick(40, 40));
  await wait(400);
  results.push({ ...(await heard(page, 'press_1997.mp3')), how: at ? `a mouse press on ${at.id}` : 'os.handleClick' });
  await page.screenshot({ path: path.join(OUT, '1997-press.png') });
  // the channel: joined, the room's lines arrive
  await page.evaluate(() => window.__os.joinChannel());
  await wait(9000);
  results.push({ ...(await heard(page, 'irc_pop_1997.mp3')), how: 'the channel joined; the room speaks' });
  await page.screenshot({ path: path.join(OUT, '1997-irc.png') });
  await page.close();
}
// ── 2003: the network list ──
{
  const page = await browser.newPage(); await page.evaluateOnNewDocument(WRAP);
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=2&debug=1&home=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__app && window.__os && window.__camPose, { timeout: 180000 });
  await wait(6000);
  await page.evaluate(() => { const o = window.__os; o.debugJump('calebAlert'); });
  await wait(1500);
  const began = await page.evaluate(() => { const a = window.__os.accountability; if (!a) return false; a.beginNetworkFailure(); return true; });
  await wait(4200);
  results.push({ ...(await heard(page, 'net_try_2003.mp3')), how: began ? 'the network list, begun by its own entry' : 'NO accountability window' });
  results.push({ ...(await heard(page, 'net_fail_2003.mp3')), how: began ? 'the first contact failing' : 'NO accountability window' });
  await page.screenshot({ path: path.join(OUT, '2003-network.png') });
  await page.close();
}
await browser.close();
const ok = results.every((r) => r.made > 0 && r.errors === 0 && r.played && r.duration > 0);
for (const r of results) console.log(`${r.made > 0 && !r.errors && r.played ? 'HEARD' : 'SILENT'}  ${r.file}  made ${r.made}, played ${r.played}, ${r.duration.toFixed(3)} s, volume ${r.volume.join('/')}  (${r.how})`);
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ ok, results }, null, 1));
process.exit(ok ? 0 : 1);
