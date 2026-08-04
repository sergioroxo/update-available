/**
 * S70 screenshot capture, pass 2 — same four states, framed so the thing each
 * one exists to show is fully on screen (the selected comment above its picker,
 * the whole routed reply with its grey line, the echo, the sheep over a fence).
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://localhost:5173/?reinterp=1&era=3&debug=1';
const OUT = path.resolve('shots');
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'],
  defaultViewport: { width: 1400, height: 900 }
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForFunction(() => window.__era3Devices && window.__era3Devices(), { timeout: 30000 });
await wait(4000);

const beat = (b) => page.evaluate((x) => window.__graceQueue().debugBeat(x), b);
const move = (n) => page.evaluate((x) => window.__requestMove(x), n);
const run = (fn, ...a) => page.evaluate(fn, ...a);

async function grab(device, name) {
  const url = await page.evaluate((d) => window.__era3Devices()[d].toDataURL('image/png'), device);
  const buf = Buffer.from(url.split(',')[1], 'base64');
  fs.writeFileSync(path.join(OUT, `${name}.png`), buf);
  console.log(`${name}: ${buf.length} bytes`);
}

// ── the tablet comes to hand ──
await move('r2-tablet');
await wait(3500);

// 1 · the thread + the picker, scrolled so the comment being answered is visible
await beat('thread');
await wait(500);
await beat('threadPick');
await wait(700);
await run(() => { const c = window.__graceQueue().comments; c.want = 'selected'; c.bump(); });
await wait(700);
await grab('tablet', '1_thread_picker');

// 2 · the reply that ROUTES — scrolled up so the whole reply + `follow-up assigned` shows
await beat('threadRoute');
await wait(1000);
await run(() => { const c = window.__graceQueue().comments; c.scrollBy(-46); });
await wait(700);
await grab('tablet', '2_route');

// 3 · THE PROPAGATION
await beat('threadEcho');
await wait(1200);
await grab('tablet', '3_propagation');

// ── the phone comes to hand: FloppySheep, played for real ──
await move('r2-phone');
await wait(3500);
await beat('floppy');
await wait(600);
await grab('phone', '4a_floppy_home');

await beat('floppyPlay');
// Played, not posed: hop when the next fence is one hop away (the sheep's
// hitbox is x 26…42, a hop lasts 0.92 s and the course opens at 80 px/s, so
// leaving at x≈66 puts her apex over the post), and keep the frame where she
// is actually above a fence with hops already on the counter.
const shot = await page.evaluate(() => new Promise((resolve) => {
  const f = window.__graceQueue().floppy;
  let frames = 0; let taps = 0;
  const tick = () => {
    if (frames++ > 1800) { resolve({ fail: { hops: f.hops, mode: f.mode, taps, y: Math.round(f.y) } }); return; }
    const open = f.fences.filter((a) => !a.cleared).map((a) => a.x);
    const near = open.length ? Math.min(...open) : 999;
    if (f.y <= 0 && near > 58 && near < 78) { f.tap(70, 300); taps++; }
    if (f.hops >= 1 && f.y > 30 && near > 14 && near < 48) {
      resolve({ png: window.__era3Devices().phone.toDataURL('image/png'), hops: f.hops, y: Math.round(f.y), near: Math.round(near) });
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}));
if (shot && shot.png) {
  fs.writeFileSync(path.join(OUT, '4_floppysheep.png'), Buffer.from(shot.png.split(',')[1], 'base64'));
  console.log('4_floppysheep:', JSON.stringify({ hops: shot.hops, y: shot.y, near: shot.near }));
} else {
  console.log('4_floppysheep: NO FRAME MATCHED', JSON.stringify(shot));
}

await browser.close();
console.log('done');
