#!/usr/bin/env node
/**
 * ⚑ S366 / J15-07 — THE HEADSET'S SIDE PLANE, MEASURED FROM THE SEAT.
 *
 *     node tools/j15-07-side-probe.mjs --port 5191 [--out out/s366/xr] [--browser]
 *
 * His note (11 Nov, in the headset): "the N12 moment should be a bit more on the side instead of being in front of you."
 * In a headset the try-on's mirror and the raid's filter card are on their own plane (era3Devices.ts `SIDE_CARD`), off to
 * his left. This probe runs the real app (?reinterp=1&era=4&debug=1) with a MOCKED headset (`app.xr.active` forced true,
 * as tools/cx4-xr-check.mjs does: mono WebGL, no stereo, no hardware timing) and a Quest-like frame (one eye: ~104° wide,
 * 96° tall), reaches the try-on, Junie's link, the raid and the naming from the seat, and reports for each surface:
 *   · the plane's world position and its bearing off the seat's line of sight (negative = left),
 *   · whether its centre, and how many of its corners, are inside the view at head yaw 0°, +50° and −50° off the seat,
 *   · the draw calls with it up.
 * Photographs each from the seat (yaw 0: it should sit at the edge of / outside the view) and turned toward it (readable).
 * `--browser` runs the same route WITHOUT the mock and reports that the plane is off and the glass still carries them.
 * Needs a Vite dev server on --port in this worktree.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 5191));
const OUT = path.resolve(flag('out', 'out/s366/xr'));
const BROWSER = argv.includes('--browser');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// x, y, z, pitch — the desk seat (app.ts seatPose(270)); yaw 270 faces +x. In the mocked headset xrComfort leans the
// eye 0.15 m in (LEAN) and the head turns the way a tracked head does (the camera's own local yaw, the rig fixed).
const SEAT = [4.6, 1.16, 0.70, 0];
const SEAT_YAW = 270;

async function main() {
  const puppeteer = (await import('puppeteer-core')).default;
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'], defaultViewport: { width: 1100, height: 960 } });
  const page = await browser.newPage();
  const errors = [], log = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 240)); });
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=4&debug=1&descent=0`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 60000 }).catch(() => {});
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
  await page.waitForFunction(() => window.__os && window.__os.e4 && window.__camFree, { timeout: 60000 });
  await page.addStyleTag({ content: 'body > *:not(canvas):not(#reinterp-ball-caption) { display: none !important; }' });
  await page.evaluate(() => window.__os.e4.browser.debugFinishProgram?.());
  await wait(1200);

  if (!BROWSER) {
    // the mocked headset: active reads true; one eye of a Quest-like frame (96° tall; 1100×960 makes it ~104° wide)
    await page.evaluate(() => {
      const app = window.__app;
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      const head = app.root.findByName('camera');
      head.camera.fov = 96;

      window.__fovPin = setInterval(() => { head.camera.fov = 96; }, 16);
    });
  }
  // the seat is set by the authored rig; a head TURN is the tracked head's own yaw (the camera's local rotation, as a
  // headset writes it), never the rig's: that is what a person turning in the chair does. dy > 0 turns left.
  const seatNow = () => page.evaluate((a) => window.__camFree(a[0], a[1], a[2], a[3], a[4]), [...SEAT, SEAT_YAW]);
  const look = async (yaw) => {
    if (BROWSER) { await page.evaluate((a) => window.__camFree(a[0], a[1], a[2], a[3], a[4]), [...SEAT, yaw]); return; }
    await page.evaluate((dy) => window.__app.root.findByName('camera').setLocalEulerAngles(0, dy, 0), yaw - SEAT_YAW);
  };
  await seatNow();
  if (!BROWSER) {
    // a headset's tracked head has a pose from its first frame: give it one, and let xrComfort seat the head (it does so
    // once, 0.5 s after the pose lands) BEFORE the first turn, or the first turn is taken for the seat
    await page.evaluate(() => { const h = window.__app.root.findByName('camera'); h.setLocalPosition(0, 0.02, 0); h.setLocalEulerAngles(0, 0, 0); });
    await wait(1500);
  }
  await page.evaluate(() => window.__os.e4.wear());
  await wait(1500);

  /** the plane's pose against the seat, and what is in view at head yaw 0 / +50 / −50 (yaw positive = turned left) */
  const measure = async (surface) => {
    const rows = {};
    for (const dy of [0, 50, -50]) {
      await look(SEAT_YAW + dy); await wait(900);
      rows[dy] = await page.evaluate(([seatYaw, dy]) => {
        const app = window.__app, cam = app.root.findByName('camera');
        const ent = app.root.findByName('era3-device-sidecard');
        const glass = app.root.findByName('era4-visor');
        const out = { sideOn: !!ent?.enabled, glassOn: !!glass?.enabled, draws: window.__drawCalls };
        if (!ent) return out;
        const xc = window.__xrComfort, active = app.xr?.active;
        const p = active ? ent.getLocalPosition() : ent.getPosition();   // under 'xr-world': local = the room's own coordinates
        // what is RENDERED: the room's coordinates through xrComfort's presentation-space map (the stage is only that map
        // between a frame's update and its render, so ent.getPosition() read here would be the unmapped one)
        const pw = active ? xc.physicalPoint(p) : ent.getPosition();
        const camW = cam.getPosition();
        const h = active ? xc.logicalPoint(camW) : camW;                 // the eye in the room's coordinates
        const gaze = active ? (() => { const r = xc.logicalRay({ p0: camW, p1: camW.clone().add(cam.forward) }); return r.p1.clone().sub(r.p0); })() : cam.forward.clone();
        // bearing of the plane from the head, against the seat's line of sight: left of it is negative
        const brg = Math.atan2(-(p.x - h.x), -(p.z - h.z)) * 180 / Math.PI;   // PlayCanvas yaw convention
        const off = ((brg - seatYaw + 540) % 360) - 180;                          // + = left of the seat's line of sight
        out.pos = [p.x, p.y, p.z].map((n) => +n.toFixed(3));
        out.head = [h.x, h.y, h.z].map((n) => +n.toFixed(3));
        out.distance = +Math.hypot(p.x - h.x, p.z - h.z).toFixed(3);
        out.offSeatDeg = +(-off).toFixed(1);   // report left as negative, like the host's right is positive
        out.heightAboveEye = +(p.y - h.y).toFixed(3);
        out.hfov = +(2 * Math.atan(Math.tan(cam.camera.fov * Math.PI / 360) * cam.camera.aspectRatio) * 180 / Math.PI).toFixed(1);
        // the plane's four corners and centre, projected through the live camera
        const sc = ent.getLocalScale(), q = ent.getLocalRotation();
        const w = app.graphicsDevice.canvas.clientWidth, hh = app.graphicsDevice.canvas.clientHeight;
        const pcVec = p.clone();
        const cornerAt = (sx, sz) => { const v = pcVec.clone(); v.set(sx * sc.x / 2, 0, sz * sc.z / 2); q.transformVector(v, v); v.add(p); return active ? xc.physicalPoint(v) : v; };
        const inView = (v) => { const s = cam.camera.worldToScreen(v); return s.z > 0 && s.x >= 0 && s.x <= w && s.y >= 0 && s.y <= hh; };
        out.centreInView = inView(pw);
        out.cornersInView = [[-1, -1], [1, -1], [-1, 1], [1, 1]].filter(([a, b]) => inView(cornerAt(a, b))).length;
        // the same, analytically, from where the head is actually looking (the horizontal extent of the plane: its two edges)
        void gaze;
        const f = cam.forward, camYaw = Math.atan2(-f.x, -f.z) * 180 / Math.PI;
        const brgW = Math.atan2(-(pw.x - camW.x), -(pw.z - camW.z)) * 180 / Math.PI;
        out.headTurnDeg = +(((camYaw - seatYaw + 540) % 360) - 180).toFixed(1);   // + = turned left of the seat (the rig faces seatYaw)
        const half = Math.atan((sc.x / 2) / Math.hypot(p.x - h.x, p.z - h.z)) * 180 / Math.PI;
        const delta = (((brgW - camYaw + 540) % 360) - 180);   // + = the plane is to the left of where he looks
        out.planeAngleFromGaze = +delta.toFixed(1);
        out.centreInViewAnalytic = Math.abs(delta) < out.hfov / 2;
        out.fractionOfWidthInView = +Math.max(0, Math.min(1, (Math.min(delta + half, out.hfov / 2) - Math.max(delta - half, -out.hfov / 2)) / (2 * half))).toFixed(2);
        const c = cam.camera.worldToScreen(pw);
        out.centreScreen = [Math.round(c.x), Math.round(c.y), +c.z.toFixed(2)];
        return out;
      }, [SEAT_YAW, dy]);
    }
    log.push(`### ${surface}`);
    for (const dy of [0, 50, -50]) log.push(`- head yaw ${dy > 0 ? '+' : ''}${dy}° (${dy > 0 ? 'turned left' : dy < 0 ? 'turned right' : 'at the seat'}): ${JSON.stringify(rows[dy])}`);
    console.log(surface, JSON.stringify(rows[0]));
    return rows;
  };
  const shot = async (name, yaw, note) => {
    await look(SEAT_YAW + yaw); await wait(500);
    const file = `${name}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    const st = await page.evaluate(() => { const b = window.__os.e4.ball; return { phase: b.phaseId, filter: b.filterAmount?.toFixed?.(2), dc: window.__drawCalls }; });
    log.push(`- ${file} — ${note} · head yaw ${yaw}° off the seat · phase ${st.phase} · filter ${st.filter} · draws ${st.dc}`);
    console.log(file, note, JSON.stringify(st));
    await look(SEAT_YAW);
  };
  const tag = BROWSER ? 'browser-' : 'xr-';

  // ── the try-on's mirror ──
  await page.evaluate(() => window.__os.e4.ball.debugJumpTo('tryon'));
  const t0 = Date.now();
  const at = async (s) => { const ms = s * 1000 - (Date.now() - t0); if (ms > 0) await wait(ms); };
  await at(2); await shot(`${tag}tryon-seat-early`, 0, 'the mirror growing in, from the seat');
  await at(13);
  const mirror = await measure('the try-on mirror (jaw, ~15 s)');
  await shot(`${tag}tryon-seat`, 0, 'the mirror, head at the seat');
  await shot(`${tag}tryon-turned`, 52, 'the mirror, head turned toward it');
  await shot(`${tag}tryon-turned-away`, -52, 'the mirror, head turned the other way (host side)');
  await at(24); await shot(`${tag}tryon-turned-late`, 52, 'the mirror, hands and gloss');
  await page.waitForFunction(() => window.__os.e4.ball.invited, { timeout: 40000 }).catch(() => {});
  await wait(600);
  await shot(`${tag}invited-seat`, 0, "Junie's link in front of him (the mirror stays at the side)");
  const invited = await page.evaluate(() => { const b = window.__os.e4.ball; return { hits: (b.hits || []).map((h) => h.id) }; });
  log.push(`- invited: pressable from the glass in front: ${JSON.stringify(invited.hits)}`);
  await page.evaluate(() => { const h = window.__os.e4.ball.hits[0]; window.__os.handleClick(h.x + h.w / 2, h.y + h.h / 2); });
  // ── the raid and the naming: the filter card with its handle ──
  await wait(2500);
  await shot(`${tag}raid-seat`, 0, 'the raid, from the seat (the host and the people in the world; the card at the side)');
  await shot(`${tag}raid-turned`, 52, 'the raid: the filter card, head turned toward it');
  await page.waitForFunction(() => window.__os.e4.ball.phaseId === 'naming', { timeout: 40000 }).catch(() => {});
  let card = null, got = false;
  for (let i = 0; i < 60 && !got; i++) {
    await wait(1000);
    const st = await page.evaluate(() => ({ phase: window.__os.e4.ball.phaseId, k: window.__os.e4.ball.filterAmount, hits: (window.__os.e4.ball.hits || []).map((h) => h.id) }));
    if (st.hits.some((h) => h.startsWith('naming-press-'))) await page.evaluate(() => { const h = window.__os.e4.ball.hits[0]; window.__os.handleClick(h.x + h.w / 2, h.y + h.h / 2); });
    if (st.phase === 'naming' && st.k < 0.8 && st.k > 0.15) {
      card = await measure('the filter card with its handle dragged (naming)');
      await shot(`${tag}naming-seat`, 0, 'the naming: the host and the tags in front, the card at the edge');
      await shot(`${tag}naming-turned`, 52, 'the naming: the filter card with the handle, head turned toward it');
      got = true;
    }
    if (st.phase !== 'naming' && st.phase !== 'raid') break;
  }
  log.push(`\nfilter card measured: ${got}`);

  fs.writeFileSync(path.join(OUT, `REPORT${BROWSER ? '-browser' : ''}.md`), `STATUS: generated\n\n# J15-07 side-plane probe (${BROWSER ? 'browser look-mode, no headset' : 'mocked headset, mono'}) · ${new Date().toISOString()}\n\nFrame: 1100×960, camera fov 96° vertical (~104° wide = one Quest eye). Offsets: negative = left of the desk seat's line of sight.\n\n${log.join('\n')}\n\n## page errors\n${errors.join('\n') || 'none'}\n`);
  console.log(`errors: ${errors.length ? errors.join('\n') : 'none'}`);
  void mirror; void card;
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
