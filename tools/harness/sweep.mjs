/**
 * THE VISUAL SWEEP — every seat × every era state × every room, plus each
 * S67 overlook. Screenshots land in shots-<tag>/ for eyeballing.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TAG = process.argv[2] ?? 'before';
const OUT = path.resolve(`shots-${TAG}`);
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const EYE_Y = 1.16;
// seat poses (app.ts seatPose) + the S67 overlooks (app.ts RELOC_POSES)
const SEATS = [
  ['seat-r1', 0, EYE_Y, 0.7, 0, 0],
  ['seat-r1-turned', 0, EYE_Y, 0.7, 0, 180],
  ['seat-r2', -4.4, EYE_Y, 0.7, 0, 90],
  ['seat-r3', 4.4, EYE_Y, 0.7, 0, 270]
];
const OVERLOOKS = [
  ['look-A-room1', 0.25, 2.16, 1.75, -17, 0],
  ['look-e1hold', -0.30, 2.20, 1.62, -19, 0],
  ['look-B-open', -2.30, 2.28, 1.60, -13, 52],
  ['look-R2', -4.15, 2.16, 1.75, -17, 90],
  ['look-C-cross', 2.30, 2.28, 1.60, -13, 308]
];

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'],
  defaultViewport: { width: 1280, height: 860 }
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));

for (const era of [2, 3, 4]) {
  await page.goto(`http://localhost:5173/?reinterp=1&era=${era}&debug=1&descent=0`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => window.__camFree !== undefined, { timeout: 30000 });
  await wait(7000);
  const shots = era >= 3 ? [...SEATS, ...OVERLOOKS] : [SEATS[0], SEATS[1], ...OVERLOOKS];
  for (const [name, x, y, z, pitch, yaw] of shots) {
    await page.evaluate((a) => window.__camFree(a[0], a[1], a[2], a[3], a[4]), [x, y, z, pitch, yaw]);
    await wait(500);
    await page.screenshot({ path: path.join(OUT, `e${era}_${name}.png`) });
  }
  // the two device seats need the real move (the held read is a side effect)
  if (era >= 3) {
    for (const node of ['r2-tablet', 'r2-phone']) {
      await page.evaluate((n) => window.__requestMove(n), node);
      await wait(2500);
      await page.screenshot({ path: path.join(OUT, `e${era}_seat-${node}.png`) });
      const now = await page.evaluate(() => window.__reinterpNow);
      console.log(`e${era} ${node}: CURRENT = "${now}"`);
    }
  }
  const calls = await page.evaluate(() => ({ draw: window.__drawCalls, batched: window.__batchedProps }));
  console.log(`e${era}: draw calls ${calls.draw}, batched props ${calls.batched}`);
}

await browser.close();
console.log('sweep →', OUT);
