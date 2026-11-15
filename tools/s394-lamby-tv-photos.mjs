#!/usr/bin/env node
/**
 * ⚑ S394 (UiB job 27 Part B7) — THE LAMBY SET, PHOTOGRAPHED: from the seat, turned to its place, and in the hand, on the
 * computer, in the emulated headset and on the phone. The BEFORE frames are job 26 B's TVs, taken on its own commit with
 * tools/s392-tv-photos.mjs (`--label before --playing`), in the same folder.
 *
 *     node tools/s394-lamby-tv-photos.mjs --port 5194 [--out output/s394-photos] [--mode desktop|xr|phone|all] [--only 1997|2016|2026]
 *
 * For each room three frames per mode: `seat` (the seat at rest, what a visitor sees on arrival), `place` (the eye turned to
 * the set where it stands, lit and paused at a margin line, as after its moment), `held` (the set brought close — the review
 * aid `__teachingTv.take`, the same call the moment makes — playing a second into a margin line, so the picture, the caption
 * and the margin are in the frame). Review routes (`?era=`) are used freely: a photograph is not a reachability claim
 * (tools/walk.mjs is). Writes <out>/after-<mode>-<room>-<frame>.png and <out>/after.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'output/s394-photos'));
const MODE = flag('mode', 'all');
const ONLY = flag('only', '');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const TAPES = JSON.parse(fs.readFileSync('data/room/teaching_tapes.json', 'utf8')).tapes;
const ROOMS = [
  { id: '1997', era: 1, seat: { x: 0, y: 1.16, z: 0.7, pitch: 0, yaw: 0 } },
  { id: '2016', era: 3, seat: { x: -4.4, y: 1.16, z: 0.7, pitch: -8, yaw: 93 } },
  { id: '2026', era: 4, seat: { x: 4.6, y: 1.16, z: 0.7, pitch: -8, yaw: 270 } }
];
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required', '--disable-audio-output'] });
const sheet = {};

async function room(r, mode) {
  const xr = mode === 'xr', phone = mode === 'phone';
  const VW = phone ? 844 : 1280, VH = phone ? 390 : 720;
  const page = await browser.newPage();
  if (phone) await page.emulate({ userAgent: IPHONE_UA, viewport: { width: VW, height: VH, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: true } });
  else await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
  const q = r.era === 1 ? '?reinterp=1&kiosk=0&debug=1&home=0' : `?reinterp=1&era=${r.era}&debug=1&descent=0&kiosk=0`;
  await page.goto(`http://localhost:${PORT}/${q}`, { waitUntil: 'load', timeout: 180000 });
  if (r.era === 1) {
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 60000 }).catch(() => {});
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
  }
  await page.waitForFunction(() => window.__app && window.__teachingTv && window.__camPose && window.__os, { timeout: 180000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic { display: none !important; }' });
  await wait(5000);
  for (let i = 0; i < 60; i++) { const p = await page.evaluate(() => window.__camPose()); if (!p.driven && !p.descent) break; await wait(1000); }
  if (r.era === 1) await page.evaluate(() => window.__os.debugJump('desktop'));
  if (r.era === 3) await page.evaluate(() => { const g = window.__graceQueue(); g.debugBeat('board'); g.seenTask = true; g.wotdSaid = true; g.waitSaid = true; g.lambLines = null; g.lambPriority = false; g.bump(); });
  if (xr) {
    await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
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
  await wait(1500);
  const look = async (target) => {
    if (xr) {
      await page.evaluate((p) => {
        const app = window.__app, head = app.root.findByName('camera'), c = window.__xrComfort;
        if (!p) { head.setLocalEulerAngles(0, 0, 0); return; }
        const t = c.physicalPoint(head.getPosition().clone().set(p[0], p[1], p[2])), o = head.getPosition(), d = t.clone().sub(o);
        // the head's euler is in its rig's frame: the world direction taken into it (the rig turns with the seat's yaw)
        head.parent.getRotation().clone().invert().transformVector(d, d);
        head.setLocalEulerAngles(Math.atan2(d.y, Math.hypot(d.x, d.z)) * 180 / Math.PI, Math.atan2(-d.x, -d.z) * 180 / Math.PI, 0);
      }, target);
    } else {
      await page.evaluate((p, s) => {
        if (!p) { window.__camFree(s.x, s.y, s.z, s.pitch, s.yaw); return; }
        const dx = p[0] - s.x, dy = p[1] - s.y, dz = p[2] - s.z;
        window.__camFree(s.x, s.y, s.z, Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI, Math.atan2(-dx, -dz) * 180 / Math.PI);
      }, target, r.seat);
    }
    await wait(900);
  };
  const T = TAPES[r.id], m = T.margin.find((x) => x.start > T.partOneEnd) ?? T.margin[0], t0 = m.start + 1.2;
  const frames = {};
  await look(null);
  await page.screenshot({ path: path.join(OUT, `after-${mode}-${r.id}-seat.png`) }); frames.seat = true;
  // lit and paused at its place, as after its moment (the review aid plays then pauses; the probe proves the presses)
  await page.evaluate((id, t) => { window.__teachingTv.play(id, t); }, r.id, t0); await wait(1500);
  await page.evaluate((id) => window.__teachingTv.press(id, 'tv-pause'), r.id); await wait(600);
  const g = await page.evaluate((id) => window.__teachingTv().tvs.find((x) => x.tape === id).targets.glass, r.id);
  await look(g);
  await page.screenshot({ path: path.join(OUT, `after-${mode}-${r.id}-place.png`) }); frames.place = g;
  await look(null);
  await page.evaluate((id) => window.__teachingTv.take(id), r.id); await wait(1700);
  await page.evaluate((id, t) => window.__teachingTv.play(id, t), r.id, t0); await wait(2500);
  await page.screenshot({ path: path.join(OUT, `after-${mode}-${r.id}-held.png`) });
  frames.held = await page.evaluate((id) => { const tv = window.__teachingTv().tvs.find((x) => x.tape === id); return { state: tv.state, pose: tv.pose, scale: tv.heldScale, dist: tv.heldDist, bar: { caption: tv.bar.caption, margin: tv.bar.margin } }; }, r.id);
  sheet[`${mode}-${r.id}`] = frames;
  console.log(mode, r.id, JSON.stringify(frames.held));
  await page.close();
}
for (const mode of (MODE === 'all' ? ['desktop', 'xr', 'phone'] : [MODE])) for (const r of ROOMS) if (!ONLY || ONLY === r.id) await room(r, mode);
fs.writeFileSync(path.join(OUT, `after${MODE === 'all' ? '' : '-' + MODE}.json`), JSON.stringify(sheet, null, 1));
await browser.close();
