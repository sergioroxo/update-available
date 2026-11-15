#!/usr/bin/env node
/**
 * ⚑ S392 (UiB job 26 Part B0.5) — the S390 tool, pointed at the TVs' NEW places (1997 behind the seat, 2016 the wall, 2026
 * the wall beside the shelf). `--label before` runs on job 25 B's tree (the TVs still at their old places: the turned frame
 * shows the empty new place); `--label after --playing` on job 26 B's, where `--playing` starts the tape a second into its
 * first margin line, so the glass AND the margin panel are in the frame.
 *
 * ⚑ S390 (UiB job 25 Part B) — THE THREE TVs, PHOTOGRAPHED FROM THE SEAT: before and after, three look-modes.
 *
 *     node tools/s390-tv-photos.mjs --port 5361 --label before [--out out/s390/pairs] [--mode desktop|xr|phone|all]
 *                                   [--only 1997|2016|2026] [--playing]
 *
 * For each room (1997 Daniel's, 2016 Vera's, 2026 Maya's) two frames per mode: the seat at rest (what a visitor sees
 * on arrival) and the seat turned toward the TV's place (the pose the conducted moment ends on). `--label before` is run
 * on the branch's base commit, where the TVs do not exist yet, so the turned frame shows the empty place; `--label after`
 * on the built commit. `--playing` (after only) also starts each TV's short tape through the debug hook and photographs
 * it 8 s in, so the picture on the glass is in the pair.
 *
 * Modes: desktop 1280 × 720 (a mouse visitor); xr = the emulated headset (app.xr.active, a 90° head camera, the seat
 * calibrated by one controller select, exactly as tools/s386-film-probe.mjs does it); phone = an iPhone UA, 844 × 390
 * landscape, touch. Review routes (`?era=`) are used freely: a photograph is not a reachability claim (tools/walk.mjs is).
 * Writes <out>/<label>-<mode>-<room>-<rest|tv>.png and <out>/<label>.json (the pose of each frame).
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const has = (n) => argv.includes(`--${n}`);
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const LABEL = flag('label', 'after');
const OUT = path.resolve(flag('out', 'out/s390/pairs'));
const MODE = flag('mode', 'all');
const ONLY = flag('only', '');
const PLAYING = has('playing');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

/** where each TV's glass is (world metres) — the same numbers as data/room/teaching_tvs.json; kept here so the BEFORE
 *  run (on a commit without that file) turns to the same place */
const ROOMS = [
  { id: '1997', era: 1, seat: { x: 0, y: 1.16, z: 0.7, pitch: 0, yaw: 0 }, glass: { x: 1.691, y: 0.92, z: 1.75 } },
  { id: '2016', era: 3, seat: { x: -4.4, y: 1.16, z: 0.7, pitch: -8, yaw: 93 }, glass: { x: -4.45, y: 1.30, z: 2.356 } },
  { id: '2026', era: 4, seat: { x: 4.6, y: 1.16, z: 0.7, pitch: -8, yaw: 270 }, glass: { x: 5.345, y: 1.52, z: -0.605 } }
];
const facing = (seat, g) => {
  const dx = g.x - seat.x, dy = g.y - seat.y, dz = g.z - seat.z;
  return { yaw: Math.atan2(-dx, -dz) * 180 / Math.PI, pitch: Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI };
};

const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required', '--disable-audio-output'] });
const sheet = {};

async function room(r, mode) {
  const xr = mode === 'xr', phone = mode === 'phone';
  const VW = phone ? 844 : 1280, VH = phone ? 390 : 720;
  const page = await browser.newPage();
  if (phone) await page.emulate({ userAgent: IPHONE_UA, viewport: { width: VW, height: VH, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: true } });
  else await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  const q = r.era === 1 ? '?reinterp=1&kiosk=0&debug=1&home=0' : `?reinterp=1&era=${r.era}&debug=1&descent=0&kiosk=0`;
  await page.goto(`http://localhost:${PORT}/${q}`, { waitUntil: 'load', timeout: 180000 });
  if (r.era === 1) {
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 60000 }).catch(() => {});
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
  }
  await page.waitForFunction(() => window.__app && window.__camPose && window.__camFree, { timeout: 180000 });
  await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
  await wait(6000);
  for (let i = 0; i < 60; i++) { const p = await page.evaluate(() => window.__camPose()); if (!p.driven && !p.descent) break; await wait(1000); }
  if (xr) {
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      window.__controller = src; app.xr.input.fire('add', src);
    });
    await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
    await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
    await wait(1500);
    await page.evaluate(() => { const a = window.__app; a.on('update', () => { const d = a.root.findByName('xr-debug'); if (d) d.enabled = false; }); });
  }
  if (PLAYING) {
    const T = JSON.parse(fs.readFileSync('data/room/teaching_tapes.json', 'utf8')).tapes[r.id];
    const at = T.margin?.[0] ? T.margin[0].start + 1 : 20;
    await page.evaluate((id, t) => window.__teachingTv?.play?.(id, t), r.id, at);
    await wait(5000);
  }
  const shot = async (kind) => {
    const file = `${LABEL}-${mode}-${r.id}-${kind}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    const pose = await page.evaluate(() => window.__camPose());
    sheet[file] = { cam: `${pose.x.toFixed(2)}, ${pose.y.toFixed(2)}, ${pose.z.toFixed(2)} · pitch ${pose.pitch.toFixed(1)} yaw ${pose.yaw.toFixed(1)}` };
  };
  const look = async (yaw, pitch) => {
    if (xr) {
      // the head turns (the rig holds the seat): aim the head camera at the bearing, relative to the calibrated rig
      // the head turns (the rig holds the calibrated seat): aim it at the bearing's world point through the comfort's own
      //   physical frame, as tools/close-site-xr-probe.mjs does
      await page.evaluate((yaw, pitch, s) => {
        const app = window.__app, head = app.root.findByName('camera'), c = window.__xrComfort;
        const R = Math.PI / 180, d = 2;
        const p = { x: s.x - Math.sin(yaw * R) * Math.cos(pitch * R) * d, y: s.y + Math.sin(pitch * R) * d, z: s.z - Math.cos(yaw * R) * Math.cos(pitch * R) * d };
        const t = c.physicalPoint(head.getPosition().clone().set(p.x, p.y, p.z)), o = head.getPosition(), v = t.clone().sub(o);
        head.setLocalEulerAngles(Math.atan2(v.y, Math.hypot(v.x, v.z)) * 180 / Math.PI, Math.atan2(-v.x, -v.z) * 180 / Math.PI, 0);
      }, yaw, pitch, r.seat);
    } else {
      await page.evaluate((s, yaw, pitch) => window.__camFree(s.x, s.y, s.z, pitch, yaw), r.seat, yaw, pitch);
    }
    await wait(1200);
  };
  await look(r.seat.yaw, r.seat.pitch);
  await shot('rest');
  const f = facing(r.seat, r.glass);
  await look(f.yaw, f.pitch);
  await shot('tv');
  if (errors.length) console.log(`  [${mode} ${r.id}] page errors:`, errors.slice(0, 3));
  await page.close();
}

for (const mode of (MODE === 'all' ? ['desktop', 'xr', 'phone'] : [MODE])) {
  for (const r of ROOMS) {
    if (ONLY && ONLY !== r.id) continue;
    console.log(`${LABEL} · ${mode} · ${r.id}`);
    await room(r, mode);
  }
}
const sheetPath = path.join(OUT, `${LABEL}.json`);
const prev = fs.existsSync(sheetPath) ? JSON.parse(fs.readFileSync(sheetPath, 'utf8')) : {};
fs.writeFileSync(sheetPath, JSON.stringify({ ...prev, ...sheet }, null, 1));
await browser.close();
console.log('wrote', OUT);
