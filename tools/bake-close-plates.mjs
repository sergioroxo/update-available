#!/usr/bin/env node
/**
 * BAKE THE CLOSE'S FOUR ROOM PLATES (2026-09-12, Phase D).
 *
 *     node tools/bake-close-plates.mjs --port 3000
 *
 * Sérgio: *"You see the 4 panels around you that have the explanation and
 * image of the Era."* The image is the era's own room, photographed from a
 * step behind its seat — the picture a player has of the place — and baked
 * to `public/assets/close/era{1..4}.jpg` so the Close's panel atlas
 * (`src/room/pointCloud.ts`) can `drawImage` it at asset load. Nothing here
 * runs at runtime; this is a build-time tool exactly like `tools/shots.mjs`,
 * whose Chrome/puppeteer conventions it borrows (optional devDependency,
 * system Chrome, swiftshader).
 *
 * Re-run it whenever a room changes enough to show in a 640-wide plate.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const PORT = Number(flag('port', 3000));
const OUT = path.resolve('public/assets/close');
const VIEWPORT = { width: 1280, height: 860 };

/** one pose per era: a step behind the era's seat, a little above it, looking
 *  slightly down — the room, with its instrument in it */
const PLATES = {
  1: { x: 0.0, y: 1.42, z: 1.85, pitch: -7, yaw: 0 },
  2: { x: 0.0, y: 1.42, z: 1.85, pitch: -7, yaw: 0 },
  3: null,   // Room 2: taken from its own seat, read at runtime (`r2`)
  4: null    // Room 3: taken from its own seat, read at runtime (`r3`)
};
const SEAT_FOR = { 3: 'r2', 4: 'r3' };

function resolveChrome() {
  const explicit = flag('chrome') ?? process.env.CHROME ?? process.env.CHROME_PATH ?? process.env.PUPPETEER_EXECUTABLE_PATH;
  if (explicit) return fs.existsSync(explicit) ? explicit : null;
  const candidates = process.platform === 'darwin' ? [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium'
  ] : ['/usr/bin/google-chrome', '/usr/bin/chromium'];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const chrome = resolveChrome();
  if (!chrome) { console.log('no Chrome found — set $CHROME'); process.exit(1); }
  const puppeteer = (await import('puppeteer-core')).default;
  const browser = await puppeteer.launch({
    executablePath: chrome, headless: true,
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'],
    defaultViewport: VIEWPORT
  });
  fs.mkdirSync(OUT, { recursive: true });
  for (const era of [1, 2, 3, 4]) {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${PORT}/?reinterp=1&era=${era}&debug=1&descent=0`, { waitUntil: 'networkidle2', timeout: 60000 });
    // the front door (shots.mjs's own lesson): the button arms after a delay
    await page.waitForFunction(() => [...document.querySelectorAll('button')]
      .some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 30000 }).catch(() => {});
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
    await page.waitForFunction(() => window.__camFree !== undefined && window.__poses !== undefined, { timeout: 30000 });
    await wait(6000); // models, batching, the first settled frames
    // the piece's own overlays (look button, pause, the debug readouts) are DOM;
    // the plate is the canvas alone
    await page.addStyleTag({ content: 'body > *:not(canvas) { display: none !important; }' });
    let pose = PLATES[era];
    if (!pose) {
      const poses = await page.evaluate(() => window.__poses());
      const seat = poses.seats[SEAT_FOR[era]];
      // a step back along the seat's own bearing, a little up, a little down
      const yawR = seat.yaw * Math.PI / 180;
      pose = { x: seat.x + Math.sin(yawR) * 0.9, y: seat.y + 0.26, z: seat.z + Math.cos(yawR) * 0.9, pitch: -7, yaw: seat.yaw };
    }
    await page.evaluate((a) => window.__camFree(a[0], a[1], a[2], a[3], a[4]), [pose.x, pose.y, pose.z, pose.pitch, pose.yaw]);
    await wait(900);
    // 8:7 crop from the centre: the atlas cell the panel gives the picture
    const cw = 980, ch = 860;
    const file = path.join(OUT, `era${era}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 82, clip: { x: (VIEWPORT.width - cw) / 2, y: 0, width: cw, height: ch } });
    console.log(`wrote ${path.relative(process.cwd(), file)}  pose ${JSON.stringify(pose)}`);
    await page.close();
  }
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
