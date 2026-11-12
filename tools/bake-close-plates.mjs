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
 *
 * ⚑ S376 (UiB job 19 Part B, VISUAL_REVIEW_2026-11-12 #4) — re-run on 12 Nov: the plates had been baked on 26 Sep
 * (S177c), so 2003's window was blank and 2026 still showed the laptop removed on 8 Nov. Two fixes so a re-bake is
 * one command again: 1997 is opened the way a visitor opens it (no `?era=`: a 1997 jump now lands in the entrance's
 * stars), and every era waits until the camera is nobody else's (the entrance and the descent drive it) before the
 * pose is set. `--eras 1,2` re-bakes some of them; `--out <dir>` writes somewhere other than public/assets/close.
 *
 *     node tools/bake-close-plates.mjs --port 5298 [--eras 1,2,3,4] [--out public/assets/close]
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const PORT = Number(flag('port', 3000));
const OUT = path.resolve(flag('out', 'public/assets/close'));
const ERAS = String(flag('eras', '1,2,3,4')).split(',').map(Number).filter((n) => n >= 1 && n <= 4);
const VIEWPORT = { width: 1280, height: 860 };

/** one pose per era: a step behind the era's seat, a little above it, looking
 *  slightly down — the room, with its instrument in it */
/** ⚑ 2026-09-13: TWO METRES back, not one — the first plates from a step behind
 *  the seat were the instrument filling the frame; the one Sérgio pointed at
 *  (a fluke of an early frame) showed the bed, the chair, the desk: the ROOM.
 *  Each pose is inside its room's own floor, 2.4 m behind its seat, a little up. */
const PLATES = {
  1: { x: 0.0, y: 1.55, z: 2.7, pitch: -9, yaw: 0 },
  2: { x: 0.0, y: 1.55, z: 2.7, pitch: -9, yaw: 0 },
  3: null,   // Room 2: from its own seat, read at runtime (`r2`)
  4: null    // Room 3: from its own seat, read at runtime (`r3`)
};
const SEAT_FOR = { 3: 'r2', 4: 'r3' };
const BACK = 2.4;

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
  for (const era of ERAS) {
    const page = await browser.newPage();
    // 1997 the way a visitor arrives (tools/stills.mjs does the same): `?era=1` lands in the entrance's stars
    const query = era === 1 ? '?reinterp=1&kiosk=0&debug=1&home=0' : `?reinterp=1&kiosk=0&era=${era}&debug=1&descent=0&home=0`;
    await page.goto(`http://localhost:${PORT}/${query}`, { waitUntil: 'networkidle2', timeout: 120000 });
    // the front door (shots.mjs's own lesson): the button arms after a delay
    await page.waitForFunction(() => [...document.querySelectorAll('button')]
      .some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 30000 }).catch(() => {});
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
    await page.waitForFunction(() => window.__camFree !== undefined && window.__poses !== undefined, { timeout: 60000 });
    await wait(6000); // models, batching, the first settled frames
    // the camera must be nobody else's: a pose set under the entrance or the descent is simply erased
    for (const t0 = Date.now(); Date.now() - t0 < 60000;) {
      const p = await page.evaluate(() => window.__camPose());
      if (!p.driven && !p.descent) break;
      await wait(500);
    }
    // the piece's own overlays (look button, pause, the debug readouts) are DOM;
    // the plate is the canvas alone
    await page.addStyleTag({ content: 'body > *:not(canvas) { display: none !important; }' });
    let pose = PLATES[era];
    if (!pose) {
      const poses = await page.evaluate(() => window.__poses());
      const seat = poses.seats[SEAT_FOR[era]];
      // a step back along the seat's own bearing, a little up, a little down
      const yawR = seat.yaw * Math.PI / 180;
      pose = { x: seat.x + Math.sin(yawR) * BACK, y: seat.y + 0.39, z: seat.z + Math.cos(yawR) * BACK, pitch: -9, yaw: seat.yaw };
    }
    // ⚑ placed twice: the entrance's own settling can re-seat the camera a
    //   beat after the first call, and a plate from the seat is not the room
    for (let k = 0; k < 3; k++) {
      await page.evaluate((a) => window.__camFree(a[0], a[1], a[2], a[3], a[4]), [pose.x, pose.y, pose.z, pose.pitch, pose.yaw]);
      await wait(1200);
    }
    const got = await page.evaluate(() => window.__camPose());
    if (Math.abs(got.x - pose.x) > 0.05 || Math.abs(got.z - pose.z) > 0.05) console.log(`  ⚠ camera did not hold the pose: ${JSON.stringify([got.x, got.y, got.z, got.pitch, got.yaw])}`);
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
