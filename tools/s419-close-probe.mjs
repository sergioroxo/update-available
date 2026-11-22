#!/usr/bin/env node
/**
 * ⚑ S419 (UiB job 34 Part C; job 33's calls 18 and 19) — 2026'S TWO TEXTS AT THE CLOSE, AND ITS SITE, photographed.
 *
 *     node tools/s419-close-probe.mjs --port 5591 --out <dir> [--modes desktop,xr,phone]
 *
 * Per look-mode: 2026 settled (`?era=4`), the Close asked for from Maya's room (`__enterClose`, as tools/s404-crt-probe.mjs):
 *   · CRT — Daniel's CRT with its first two cards drawn (2016, then 2026: Maya's line and its mark), and the glass canvas
 *     itself (800 × 600) at that moment (`CRT_glass_<mode>.png`);
 *   · PANEL — the message cards pressed through (a press anywhere turns a card), the panels open, the view turned to the
 *     2026 panel (computer and phone: `__camFree`; headset mock: the head turned, as tools/close-site-xr-probe.mjs), and the
 *     size its paragraph landed on (`__closePanelSizes[3]`: the 28 px floor);
 *   · SITE — the 2026 era site open in the site viewer (`__siteViewer.open('2026')`; the visitor opens it by pressing the
 *     panel, which tools/close-site-xr-probe.mjs proves), at its top and scrolled to the panel quote.
 * Headset: the seated mock (xr.active forced, the head at (0, 1.2, 0), 90° view, a controller added and a select).
 * Writes report.json beside the PNGs.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s419-close'));
const MODES = flag('modes', 'desktop,xr,phone').split(',');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const VIEW = { desktop: { width: 1280, height: 720, deviceScaleFactor: 1 }, xr: { width: 1000, height: 1000, deviceScaleFactor: 1 },
  phone: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } };
const HIDE = 'body > *:not(canvas) { visibility: hidden !important; }';

async function run(mode) {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 180000,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--disable-audio-output'] });
  const page = await browser.newPage();
  await page.setViewport(VIEW[mode]);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  const r = { mode, errors };
  const shot = (name) => page.screenshot({ path: path.join(OUT, `${name}_${mode}.png`) });
  try {
    await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=4&debug=1&descent=0&home=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => window.__app && window.__os && window.__danielLine && window.__enterClose && window.__closeState, { timeout: 180000 });
    const hide = await page.addStyleTag({ content: HIDE });
    await wait(5000);
    if (mode === 'xr') {
      await page.evaluate(() => {
        const app = window.__app, head = app.root.findByName('camera');
        Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
        head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
        const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
        window.__controller = src; app.xr.input.fire('add', src); app.xr.input.fire('select', src);
        app.on('update', () => { const d = app.root.findByName('xr-debug'); if (d) d.enabled = false; });
      });
      await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
      await wait(2000);
    }
    await page.evaluate(() => window.__enterClose());
    // ── the CRT: 2016, then 2026 (Maya's line and its mark) drawn in ──
    const until = async (pred, limit) => { const s = Date.now(); while (Date.now() - s < limit) { if (await page.evaluate(pred)) return true; await wait(150); } return false; };
    r.crtCard2 = await until(() => window.__danielLine.shown === 2 && window.__danielLine.drawn, 150000);
    await wait(500);
    await shot('CRT');
    const glass = await page.evaluate(() => {
      const g = window.__app.root.findByName('daniel-line-crt')?.findByName('close-crt-glass');
      const mi = g?.render?.meshInstances?.[0];
      const tex = mi?.material?.emissiveMap ?? mi?.material?.diffuseMap;
      const src = tex?.getSource?.();
      return src && src.toDataURL ? src.toDataURL('image/png') : null;
    });
    if (glass) fs.writeFileSync(path.join(OUT, `CRT_glass_${mode}.png`), Buffer.from(glass.split(',')[1], 'base64'));
    // ── through the message cards to the panels ──
    const t0 = Date.now();
    let pressed = -1;
    while (Date.now() - t0 < 300000) {
      const st = await page.evaluate(() => window.__closeState());
      if (st.panels && st.open > 0.98 && !/message|travel|lookUp|hold|line/.test(st.stage ?? '')) break;
      if (st.stage === 'message' && st.card !== pressed) {
        await wait(2000);
        if (mode === 'xr') await page.evaluate(() => window.__app.root.findByName('camera').setLocalEulerAngles(0, 0, 0));
        await page.mouse.click(VIEW[mode].width / 2, VIEW[mode].height / 2); pressed = st.card; await wait(900); continue;
      }
      await wait(1000);
    }
    r.closeState = await page.evaluate(() => window.__closeState());
    await wait(6000);
    // ── the 2026 panel, turned to ──
    const p = (await page.evaluate(() => window.__closePanels())).find((q) => q.era === 4);
    r.panel = p ? { hidden: p.hidden, face: p.face } : null;
    if (p && mode === 'xr') {
      // the head is a child of the rig: its target is the panel's physical point carried into the rig's own frame; the
      // controller is pointed at the floor so the panel's hover label does not lie over the paragraph in the still
      await page.evaluate((pt) => {
        const app = window.__app, head = app.root.findByName('camera'), c = window.__xrComfort, V = head.getPosition().constructor;
        const t = c.physicalPoint(new V(pt.x, pt.y, pt.z));
        const tl = head.parent.getWorldTransform().clone().invert().transformPoint(t, new V());
        const d = tl.sub(head.getLocalPosition());
        head.setLocalEulerAngles(Math.atan2(d.y, Math.hypot(d.x, d.z)) * 180 / Math.PI, Math.atan2(-d.x, -d.z) * 180 / Math.PI, 0);
        window.__controller.getDirection = () => new V(0, -1, 0);
      }, p);
    } else if (p) {
      await page.evaluate((tg) => { const E = window.__camPose(); const dx = tg.x - E.x, dy = tg.y - E.y, dz = tg.z - E.z;
        window.__camFree(E.x, E.y, E.z, Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI, Math.atan2(-dx, -dz) * 180 / Math.PI); }, p);
    }
    await wait(1800);
    r.panelSize = await page.evaluate(() => window.__closePanelSizes?.[3] ?? null);
    r.allPanelSizes = await page.evaluate(() => window.__closePanelSizes ?? null);
    // how big the panel stands on the screen (CSS px), and whether it is whole in the frame
    r.panelOnScreen = p ? await page.evaluate((pt) => {
      const app = window.__app, cam = app.root.findByName('camera'), V = cam.getPosition().constructor;
      const c = window.__xrComfort && app.xr.active ? (q) => window.__xrComfort.physicalPoint(new V(q[0], q[1], q[2])) : (q) => new V(q[0], q[1], q[2]);
      const s = pt.corners.map((q) => cam.camera.worldToScreen(c(q)));
      const cw = app.graphicsDevice.canvas.clientWidth, ch = app.graphicsDevice.canvas.clientHeight;
      const xs = s.map((v) => v.x), ys = s.map((v) => v.y);
      return { w: Math.round(Math.max(...xs) - Math.min(...xs)), h: Math.round(Math.max(...ys) - Math.min(...ys)), whole: s.every((v) => v.z > 0 && v.x >= 0 && v.x <= cw && v.y >= 0 && v.y <= ch), view: [cw, ch] };
    }, p) : null;
    await shot('PANEL');
    // ── the 2026 site in the site viewer (the computer's and the phone's window is the page's own; the headset's a plane) ──
    await hide.evaluate((el) => el.remove());
    await page.addStyleTag({ content: 'body > *:not(canvas):not(#reinterp-site-viewer) { visibility: hidden !important; }' });
    const XR = mode === 'xr';
    if (XR) await page.evaluate(() => { const head = window.__app.root.findByName('camera'); head.setLocalEulerAngles(0, 0, 0); window.__controller.getDirection = () => head.forward.clone(); });
    // a scroll set by a review call is drawn on the window's next dirty frame: a small wheel turn (or a touch of the stick) asks for it
    const nudge = async () => {
      if (XR) { for (const v of [0.6, -0.6, 0]) { await page.evaluate((v) => { window.__controller.gamepad.axes = [0, 0, 0, v]; }, v); await wait(90); } }
      else { await page.mouse.move(VIEW[mode].width / 2, VIEW[mode].height / 2); await page.mouse.wheel({ deltaY: 1 }); }
      await wait(900);
    };
    const core = (fn, arg) => page.evaluate((xr, fn, arg) => { const c = xr ? window.__siteViewer.xr.core : window.__siteViewer.dom; return c[fn](arg); }, XR, fn, arg);
    await page.evaluate(() => window.__siteViewer.open('hub'));
    await wait(2500);
    await shot('SITE_hub');
    await page.evaluate(() => window.__siteViewer.bus.openAt('2026', 'story'));
    await wait(2500);
    r.site = await page.evaluate((xr) => { const v = window.__siteViewer; return { view: v.bus.view, xrOpen: v.xr?.isOpen ?? null, info: (xr ? v.xr.core : v.dom).info() }; }, XR);
    r.siteFound = {};
    await nudge();
    r.siteFound.panel = await core('scrollToText', 'In one paragraph');
    await nudge();
    await shot('SITE_panel');
    // a new tab's page is laid out on its first frame: draw it once before looking for a line on it
    await core('setTab', 'media');
    await nudge();
    // (the game itself is only on the web page: tools' HTML stills show its lead)
    for (const [k, t, name] of [['hedge', 'HEDGE™', 'SITE_media'], ['stream', 'transjesus.str', 'SITE_stream']]) {
      r.siteFound[k] = await core('scrollToText', t);
      await nudge();
      await shot(name);
    }
    r.drawCalls = await page.evaluate(() => window.__app.stats.drawCalls.total);
  } catch (e) {
    errors.push(String(e).slice(0, 300));
  } finally {
    await Promise.race([browser.close(), wait(5000)]);
  }
  console.log(JSON.stringify(r));
  return r;
}

const rows = await Promise.all(MODES.map((m) => run(m)));
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(rows, null, 1));
