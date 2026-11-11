#!/usr/bin/env node
/**
 * S364 (UiB job 14 B7) — the console session, proven in headless Chrome.
 *     node tools/console-session-probe.mjs --port 3183 [--out out/s364-console]
 * Light the console, draw the session into an offscreen canvas, play legal moves through the SESSION'S tap (the
 * monitor window's path), and confirm the console's own glass (its screen texture canvas), frameKey and stats moved.
 * Shots: the session's draw (title, playing, after moves) and the lit console on the bed from a free camera.
 * `CAM='[x,y,z,pitch,yaw]'` overrides the bed shot.
 */
import fs from 'node:fs';
import path from 'node:path';
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const PORT = Number(flag('port', 3183)), HOST = flag('host', '127.0.0.1');
const OUT = path.resolve(flag('out', 'out/s364-console'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
if (!chrome) { console.log('no Chrome'); process.exit(1); }
const puppeteer = (await import('puppeteer-core')).default;
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'], defaultViewport: { width: 1280, height: 860 } });
fs.mkdirSync(OUT, { recursive: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
await page.goto(`http://${HOST}:${PORT}/?reinterp=1&kiosk=0&era=4&debug=1&descent=0`, { waitUntil: 'networkidle2', timeout: 90000 });
await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 30000 }).catch(() => {});
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
await page.waitForFunction(() => window.__os && window.__os.e4 && window.__camFree && window.__consoleSession, { timeout: 60000 });
await page.addStyleTag({ content: 'body > *:not(canvas):not(#reinterp-ball-caption) { display: none !important; }' });
await wait(1500);
const results = [];
const check = (name, ok, note = '') => { results.push({ name, ok, note }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${note}`); };

// the console's own screen canvas: read the plane's texture source (the held device publishes none)
const consoleCanvasHash = () => page.evaluate(() => {
  const plane = window.__app.root.findByName('e_console-screen');
  const src = plane?.render?.meshInstances?.[0]?.material?.emissiveMap?.getSource?.();
  if (!src) return null;
  const c = document.createElement('canvas'); c.width = 96; c.height = 54;
  const x = c.getContext('2d'); x.drawImage(src, 0, 0, 96, 54);
  const d = x.getImageData(0, 0, 96, 54).data; let h = 0; for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) | 0;
  return String(h);
});

const s0 = await page.evaluate(() => { const c = window.__consoleSession; return { ready: c.ready, lit: c.lit, playing: c.playing, stats: c.stats, key: c.frameKey() }; });
check('ready once the room is built', s0.ready === true, JSON.stringify(s0));
check('not lit before light()', s0.lit === false);
const dark = await consoleCanvasHash();
check('console shows its dark home screen first', dark !== null, String(dark));

await page.evaluate(() => { window.__consoleSession.light(); window.__consoleSession.light(); });
await wait(1500);
const lit1 = await page.evaluate(() => ({ lit: window.__consoleSession.lit }));
check('lit after light() (idempotent)', lit1.lit === true);
const litHash = await consoleCanvasHash();
check("the console's glass changed when lit", litHash !== dark, `${dark} -> ${litHash}`);

const png = async (name) => {
  const data = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 800; c.height = 500; const x = c.getContext('2d'); x.fillStyle = '#c0c0c0'; x.fillRect(0, 0, 800, 500); window.__consoleSession.draw(x, 20, 20, 760, 460); return c.toDataURL('image/png'); });
  fs.writeFileSync(path.join(OUT, name), Buffer.from(data.split(',')[1], 'base64'));
};
await png('01-session-title.png');
await wait(1200);                                   // the title's arm delay
await page.evaluate(() => window.__consoleSession.tap(0.5, 0.5));
await wait(600);
const st1 = await page.evaluate(() => { const c = window.__consoleSession; return { playing: c.playing, key: c.frameKey(), state: window.__consoleProbe().s.state }; });
check('a tap on the session starts the run and marks it playing', st1.playing === true && st1.state === 'play', JSON.stringify(st1));
await png('02-session-playing.png');

let moves = 0;
for (let i = 0; i < 8 && moves < 4; i++) {
  const mv = await page.evaluate(() => window.__consoleProbe().move());
  if (!mv) { await wait(700); continue; }
  const pts = await page.evaluate((mv) => mv.map((i) => window.__consoleProbe().tpos(i)), mv);
  for (const p of pts) { await page.evaluate((p) => window.__consoleSession.tap((p.x + 30) / 960, (p.y + 30) / 540), p); await wait(150); }
  moves++;
  await wait(3200);
}
const st2 = await page.evaluate(() => { const c = window.__consoleSession; return { stats: c.stats, key: c.frameKey(), earned: window.__consoleProbe().s.earned }; });
check('legal moves were made through the session', moves > 0, `moves ${moves}`);
check('stats moved (matches)', st2.stats.matches > 0, JSON.stringify(st2));
check('percent moved and never passes 99', st2.stats.percent > 0 && st2.stats.percent <= 99, JSON.stringify(st2.stats));
check('frameKey changed', st2.key !== st1.key);
const playHash = await consoleCanvasHash();
check("the console's own glass shows the played game (changed again)", playHash !== litHash, `${litHash} -> ${playHash}`);
await png('03-session-after-moves.png');

const want = process.env.CAM ? JSON.parse(process.env.CAM) : [4.08, 0.85, 1.62, -89, 90];
await page.evaluate((a) => window.__camFree(...a), want);
await wait(1500);
await page.screenshot({ path: path.join(OUT, '04-console-on-bed.png') });
const dc = await page.evaluate(() => window.__drawCalls);
check('draw calls within 75 at this view', dc <= 75, String(dc));

// pick the lit console up from the bed (a press on it, flat screen — the same device grammar the grip uses in a headset:
// heldDevice.grab → take → follow). A run already going on the monitor must not be knocked into its menu by the pick-up.
const before = await page.evaluate(() => ({ state: window.__consoleProbe().s.state, earned: window.__consoleProbe().s.earned }));
await page.mouse.click(620, 335);
await wait(1500);
const held = await page.evaluate(() => ({ state: window.__consoleProbe().s.state, earned: window.__consoleProbe().s.earned }));
check('pick-up keeps the run going (no menu opened by the wake)', held.state === 'play' && held.earned >= before.earned, JSON.stringify({ before, held }));
await page.screenshot({ path: path.join(OUT, '05-console-in-hand.png') });
const k1 = await page.evaluate(() => window.__consoleSession.frameKey());
await wait(800);
const k2 = await page.evaluate(() => window.__consoleSession.frameKey());
check('the game keeps ticking in hand', k1 !== k2, `${k1} / ${k2}`);
fs.writeFileSync(path.join(OUT, 'probe.json'), JSON.stringify({ results, errors }, null, 2));
await browser.close();
if (errors.length) console.log('page errors:', errors);
process.exit(results.every((r) => r.ok) ? 0 : 1);
