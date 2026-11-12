#!/usr/bin/env node
/**
 * S377 (UiB job 19 Part C) — THE ROOM REDRAWN, PHOTOGRAPHED. Before/after frames of the three room items the review
 * (docs/reinterp/VISUAL_REVIEW_2026-11-12.md) put in Part C and that live in the rooms: #1 the 1997 window, #7 Daniel's
 * 1997 bed, #9 the 2003 flip phone held to the eye. (#5, the Close in front of the machine, is photographed by
 * tools/close-order-probe.mjs, which plays the Close to the Restart card.)
 *
 *     node tools/s377-room.mjs --port 5299 --out out/s377/before --mode browser
 *     node tools/s377-room.mjs --port 5299 --out out/s377/before --mode xr
 *
 * From the seat (tools/harness/s375-surfaces.mjs SEAT), 2560 × 1440. In `xr` the page runs through the emulated headset
 * (tools/harness/xr-mock.mjs): the rig holds the seat and only the head turns, so a free camera becomes a look from the
 * seat. Debug jumps and set light levels are REVIEW ROUTES, never a reachability claim (tools/walk.mjs is that).
 * The wake frame sets the room's lights to the wake's first value (app.ts applyRoomLight(0): the window is the only
 * light), the frame a visitor meets as the descent begins.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { SEAT } from './harness/s375-surfaces.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const MODE = flag('mode', 'browser'); const XR = MODE === 'xr';
const ONLY = flag('only', '');
const OUT = path.resolve(flag('out', 'out/s377/shots'), MODE);
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const HIDE = 'body > *:not(canvas) { visibility:hidden !important; }';

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 300000,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox', '--disable-background-networking'],
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 2 }
});

async function openEra(n) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=${n}&debug=1&descent=0&home=0`, { waitUntil: 'load', timeout: 240000 });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => /Log in/i.test(b.textContent || '') && !b.disabled) || (window.__os && window.__camFree), { timeout: 180000 });
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Log in/i.test(x.textContent || '')); b?.click(); });
  await page.waitForFunction(() => window.__os && window.__camFree && window.__poses && window.__app, { timeout: 180000 });
  await wait(9000);
  await page.addStyleTag({ content: HIDE });
  if (XR) { const { installXrMock } = await import('./harness/xr-mock.mjs'); await installXrMock(page, n); }
  return { page, errors };
}
const cam = (page, p) => page.evaluate((a) => window.__camFree(...a), p);
const jump = async (page, b, ms = 2400) => { await page.evaluate((x) => window.__os.debugJump(x), b); await wait(ms); };
/** from the seat, look at a world point (browser: the seat's eye; headset: the head turns) */
const lookAt = (page, seat, t) => page.evaluate((a) => {
  const [s, t] = a; const dx = t[0] - s[0], dy = t[1] - s[1], dz = t[2] - s[2];
  window.__camFree(s[0], s[1], s[2], Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI, Math.atan2(-dx, -dz) * 180 / Math.PI);
}, [seat, t]);
const shot = async (page, id, note) => { await page.screenshot({ path: path.join(OUT, `${id}.png`) }); console.log(`${MODE} ${id}  ${note}`); };
/** draw calls and triangles as the debug plate counts them (one eye) */
const counts = async (page) => {
  const out = [];
  for (let i = 0; i < 6; i++) { out.push(await page.evaluate(() => ({ draws: window.__drawCalls ?? null, raw: window.__drawCallsRaw ?? null, tris: window.__app?.stats?.frame?.triangles ?? null }))); await wait(150); }
  return { draws: Math.max(...out.map((o) => o.draws ?? 0)), raw: Math.max(...out.map((o) => o.raw ?? 0)), tris: Math.max(...out.map((o) => o.tris ?? 0)) };
};
const report = {};
const want = (id) => !ONLY || ONLY.split(',').some((o) => id.startsWith(o));

try {
  if (want('e1')) {
    const { page, errors } = await openEra(1);
    const seat = SEAT[1];
    await jump(page, 'desktop', 3500);
    await cam(page, seat); await wait(1200);
    await shot(page, 'e1-seat-front', 'the seat, looking at the machine: the window left of it');
    report['e1-seat-front'] = await counts(page);
    await lookAt(page, [seat[0], seat[1], seat[2]], [-0.95, 1.55, -0.69]); await wait(1200);
    await shot(page, 'e1-seat-window', 'the seat, turned to the window');
    await lookAt(page, [seat[0], seat[1], seat[2]], [-1.45, 0.45, 1.3]); await wait(1200);
    await shot(page, 'e1-seat-bed', 'the seat, turned to the bed');
    report['e1-seat-bed'] = await counts(page);
    if (!XR) {
      await jump(page, 'kit', 2600);
      await cam(page, [1.0, 2.25, 2.55, -28, 22]); await wait(1200);
      await shot(page, 'e1-entrance', 'the 1997 still: the room from the door\'s corner (tools/stills.mjs 00-entrance)');
      await cam(page, [-0.2, 1.3, 2.4, -32, 40]); await wait(1200);
      await shot(page, 'e1-bed-near', 'the bed from above its foot (a review pose)');
    }
    // the wake's first frame: the window is the room's only light (app.ts applyRoomLight(0))
    await page.evaluate(() => {
      const set = (id, v) => { const e = window.__app.root.findByName(`light-${id}`); if (e?.light) e.light.intensity = v; };
      set('roomFill', 0.05); set('lamp', 0); set('screenGlow', 0); set('moonlight', 0.42); set('witnessCold', 0.12);
    });
    await wait(600);
    if (!XR) { await cam(page, [1.0, 2.25, 2.55, -28, 22]); await wait(900); await shot(page, 'e1-wake-entrance', 'the wake\'s first light (review state): the window alone'); }
    await lookAt(page, [seat[0], seat[1], seat[2]], [-0.95, 1.45, -0.69]); await wait(1000);
    await shot(page, 'e1-wake-window', 'the wake\'s first light (review state), from the seat');
    if (errors.length) console.log(`  page errors: ${errors.slice(0, 3).join(' · ')}`);
    await page.close();
  }
  if (want('e2')) {
    const { page, errors } = await openEra(2);
    const seat = SEAT[2];
    await jump(page, 'e2Restorify', 4500);
    await lookAt(page, [seat[0], seat[1], seat[2]], [0.44, 0.75, 0.16]); await wait(1200);
    await shot(page, 'e2-phone-desk', 'the flip phone at rest on the desk');
    await cam(page, seat); await wait(900);
    report['e2-seat'] = await counts(page);
    // in a headset the press hands the device the LOGICAL head (app.ts: `xr?.active ? logicalHead() : camera`): the room is
    // shifted under the tracked head (xrComfort), so the head's own world pose would hold it somewhere off in the room
    await page.evaluate((xr) => {
      const app = window.__app, cam = app.root.findByName('camera');
      if (!xr) { window.__heldDevices.take('e2', cam); return; }
      const xc = window.__xrComfort, p = cam.getPosition();
      const r = xc.logicalRay({ p0: p, p1: p.clone().add(cam.forward) });
      const u = xc.logicalRay({ p0: p, p1: p.clone().add(cam.up) });
      const head = new cam.constructor('s377-logical-head'); app.root.addChild(head);
      head.setPosition(r.p0); head.lookAt(r.p1, u.p1.clone().sub(u.p0).normalize());
      window.__heldDevices.take('e2', head);
    }, XR);
    await wait(2800);
    await shot(page, 'e2-held-phone', 'the flip phone held to the eye');
    report['e2-held-phone'] = await counts(page);
    if (XR) {   // the same, the head turned a little down and a little up: the whole clamshell
      await page.evaluate(() => window.__app.root.findByName('camera').setLocalEulerAngles(-12, 0, 0)); await wait(900);
      await shot(page, 'e2-held-phone-down', 'held, the eyes lowered to the hinge and the keypad');
    } else {
      await page.evaluate(() => { const c = window.__app.root.findByName('camera'); const e = c.getLocalEulerAngles(); c.setLocalEulerAngles(e.x - 9, e.y, e.z); }); await wait(900);
      await shot(page, 'e2-held-phone-down', 'held, the look lowered (drag) to the hinge and the keypad');
    }
    if (errors.length) console.log(`  page errors: ${errors.slice(0, 3).join(' · ')}`);
    await page.close();
  }
  if (want('e4')) {
    // ⚑ the stream's crowd (his ruling on job 19 A: they read as mannequins in the headset) — the raid (they walk in from
    // the sides), the naming, and inside the stream (the dance), from Maya's seat; and the crowd's flanks, turned
    const { page, errors } = await openEra(4);
    const seat = SEAT[4];
    const at = async (id, note, yaw = 0, pitch = null) => {
      await cam(page, [seat[0], seat[1], seat[2], pitch ?? seat[3], seat[4] + yaw]); await wait(1300);
      await shot(page, id, note);
      report[id] = await counts(page);
    };
    await jump(page, 'e4Ball', 2500);
    // the walk-in starts when the raid's banner has had its moment: wait for the first person to be on the way
    await page.waitForFunction(() => { const m = window.__app.root.findByName('commons-figures'); return m && m.enabled; }, { timeout: 30000 }).catch(() => {});
    await wait(2600);
    await at('e4-raid-arriving', 'the raid: the people walking in from the sides');
    await wait(7000);
    await at('e4-raid', 'the raid: the people in, from the seat');
    await at('e4-raid-left', 'the raid, turned left: the flank', 40, -4);
    await at('e4-raid-right', 'the raid, turned right: the flank', -40, -4);
    await jump(page, 'e4BallOpen', 8000);
    await at('e4-stream-open', 'inside the stream: TransJesus and the people dancing');
    await at('e4-stream-open-left', 'inside the stream, turned left', 40, -4);
    if (errors.length) console.log(`  page errors: ${errors.slice(0, 3).join(' · ')}`);
    await page.close();
  }
} finally {
  fs.writeFileSync(path.join(OUT, `counts${ONLY ? '-' + ONLY.replace(/,/g, '_') : ''}.json`), JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report));
  await Promise.race([browser.close(), wait(5000).then(() => browser.process()?.kill('SIGKILL'))]);
}
