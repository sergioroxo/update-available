/**
 * S70 screenshot capture — the four E3 tablet/phone states, straight off the
 * offscreen device canvases, written to real files.
 *
 * Runs the real build in real Chrome (puppeteer-core → the system Chrome), so
 * the frame loop, the seats and the debug beats are the shipped ones; only the
 * readback is scripted. The sandboxed pane could not deliver downloads; this
 * writes with fs.
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

async function grab(device, name) {
  const url = await page.evaluate((d) => window.__era3Devices()[d].toDataURL('image/png'), device);
  const buf = Buffer.from(url.split(',')[1], 'base64');
  const file = path.join(OUT, `${name}.png`);
  fs.writeFileSync(file, buf);
  console.log(`${name}: ${buf.length} bytes → ${file}`);
  return buf.length;
}

// ── the tablet seat: the screen comes off the bed into her hands ──
await move('r2-tablet');
await wait(3500);

// 1 · the thread + the template picker
await beat('thread');
await wait(600);
await beat('threadPick');
await wait(900);
await grab('tablet', '1_thread_picker');

// 2 · the reply that ROUTES ("follow-up assigned")
await beat('threadRoute');
await wait(1200);
await grab('tablet', '2_route');

// 3 · THE PROPAGATION — your sentence in someone else's mouth
await beat('threadEcho');
await wait(1200);
await grab('tablet', '3_propagation');

console.log(JSON.stringify(await page.evaluate(() => window.__graceQueue().comments?.debugState?.() ?? null)));

// 4 · the phone seat: FloppySheep, running
await move('r2-phone');
await wait(3500);
await beat('floppy');
await wait(800);
await grab('phone', '4a_floppy_home');
await beat('floppyPlay');
await wait(1400);
await grab('phone', '4_floppysheep');

await page.screenshot({ path: path.join(OUT, 'room_context.png') });

await browser.close();
console.log('done');
