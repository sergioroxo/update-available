#!/usr/bin/env node
/**
 * ⚑ S406 (UiB job 32 Part A, H2) — A PANEL ON TOP TAKES THE PRESS AND HIDES WHAT IS UNDER IT: 2016's board, its five panels,
 * photographed and pressed, before and after. His headset run of 20 Nov (frames 220901, 221330, 221422, 221647, 222021): the
 * board's cards were outlined through Lambient's balloon, "This week", Kindredraft and URGENT, and pressed through them.
 *
 *     node tools/s406-panels-stills.mjs --port 5461 --label after --out <dir> [--mode xr|desktop|both]
 *
 * `?era=3` at the board (review route), then for each panel: the panel put up (its own state, as the platform raises it),
 * the controller aimed (headset) or the mouse moved (computer) at a point ON THE PANEL'S BODY that lies over a card, a
 * photograph (the headset's view turned to the glass, so the ring is legible), then a press there and what it did: whether a
 * card's job opened under the panel (the bug) or the panel kept the press. Writes H2-<panel>_<label>_<mode>.png,
 * H2-<panel>_<label>_<mode>-pressed.png and <label>-<mode>.json. The point is the card's centre under the panel (the same in
 * both builds: the board is laid out alike).
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const LABEL = flag('label', 'after');
const OUT = path.resolve(flag('out', 'out/s406-panels'));
const MODES = flag('mode', 'both') === 'both' ? ['xr', 'desktop'] : [flag('mode', 'xr')];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required', '--disable-audio-output'],
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 } });

/** each panel: how the platform raises it (review route), and the card it lies over */
const PANELS = [
  { id: 'lambient-balloon', frame: '220446', balloon: true, up: `const g = q.lambyGuide; if (g) { window.__guideTick ??= g.tick; g.tick = () => {}; Object.assign(g.view, { era: 'e3', hidden: false, rung: 'tip', text: 'Pick a card on the board and work it through to the end.', targets: [], act: undefined }); g.version = (g.version ?? 0) + 1; } q.lambPriority = false;`, card: 'task-2' },
  { id: 'this-week', frame: '220901', up: `q.pauseOpen = true; q.pauseLines = q.pauseLines?.length ? q.pauseLines : ['Your record — My account · activity, at the top of GracePlatform.', 'Jobs on the board, in any order.', 'Answer the mothers.', 'Kindredraft — offered when the board is done.', 'FloppySheep — on your phone.'];`, card: 'task-1' },
  { id: 'kindredraft', frame: '221330', up: `q.storyOffer = true; q.storyOfferT = 3;`, card: 'task-1' },
  { id: 'urgent', frame: '221647', up: `q.kitPopin = true; q.kitPopinT = 1;`, card: 'task-1' },
  { id: 'important-changes', frame: '222021', up: `window.__os.debugJump('update4');`, card: 'task-1', ritual: true }
];

async function run(mode) {
  const xr = mode === 'xr';
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(`http://localhost:${PORT}/?reinterp=1&era=3&debug=1&descent=0&kiosk=0`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.__graceQueue?.() && window.__app && window.__camPose, { timeout: 180000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic { display: none !important; }' + (xr ? ' body > *:not(canvas) { visibility: hidden !important; }' : '') });
  await wait(4500);
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
  const results = [];
  for (const P of PANELS) {
    // the board, fresh: no job open, nothing else up
    await page.evaluate(() => {
      const q = window.__graceQueue(); q.debugBeat('board'); q.mode = 'board'; q.veraPage = null; q.openSurface = null;
      q.pauseOpen = false; q.storyOffer = false; q.kitPopin = false; q.lambLines = null; q.lambPriority = false; q.seenTask = true; q.wotdSaid = true; q.waitSaid = true;
      q.startPanel?.close?.();
      // the guide given back its own clock, its balloon down (the balloon state freezes it for its photograph)
      const g = q.lambyGuide; if (g && window.__guideTick) { g.tick = window.__guideTick; g.view.hidden = true; g.view.text = null; }
      q.bump();
    });
    await wait(700);
    const info = await page.evaluate((up) => {
      const q = window.__graceQueue();
      // eslint-disable-next-line no-new-func
      new Function('q', up)(q); q.bump();
      return true;
    }, P.up);
    await wait(1600);
    // the card under the panel: its centre, in the workstation's canvas px
    const at = await page.evaluate((card, balloon) => {
      const q = window.__graceQueue(); const r = (q.rects ?? []).find((h) => h.id === card);
      const W = 676, H = 390;   // the workstation's logical size (graceQueueLite's surface)
      if (!r) return null;
      if (balloon) {
        // the balloon's body from its own buttons (both builds publish lg-x top right and its answers along the foot)
        const x = (q.rects ?? []).find((h) => h.id === 'lg-x'), a = (q.rects ?? []).find((h) => h.id === 'lg-show' || h.id === 'lg-later');
        if (!x || !a) return null;
        const b = { x: a.x - 12, y: x.y - 2, w: x.x + 23 - (a.x - 12), h: a.y + 29 - (x.y - 2) };
        const x0 = Math.max(b.x, r.x), x1 = Math.min(b.x + b.w, r.x + r.w), y0 = Math.max(b.y, r.y), y1 = Math.min(b.y + b.h, r.y + r.h);
        if (x1 <= x0 || y1 <= y0) return null;
        return { x: (x0 + x1) / 2, y: Math.min(y1 - 4, y0 + 14), W, H, card: r, balloon: b };   // in the balloon's text, over the card
      }
      return { x: r.x + r.w / 2, y: r.y + r.h / 2, W, H, card: r };
    }, P.card, !!P.balloon);
    if (!at) { results.push({ panel: P.id, error: `no ${P.card} on the board` }); continue; }
    const world = await page.evaluate((a) => {
      const app = window.__app, e = app.root.findByName('era3-device-workstation');
      const V = e.getPosition().constructor;
      const w = e.getWorldTransform().transformPoint(new V(a.x / a.W - 0.5, 0, a.y / a.H - 0.5));
      return { x: w.x, y: w.y, z: w.z };
    }, at);
    if (xr) {
      // aim from a hand at the point; turn the head to the glass and narrow the lens so the ring can be read
      await page.evaluate((p) => {
        const app = window.__app, head = app.root.findByName('camera'), c = window.__xrComfort;
        const phys = c.physicalPoint(new (head.getPosition().constructor)(p.x, p.y, p.z));
        const origin = head.getPosition().clone().add(head.right.clone().mulScalar(0.12)).add(head.up.clone().mulScalar(-0.25));
        window.__controller.getOrigin = () => origin.clone();
        window.__controller.getDirection = () => phys.clone().sub(origin).normalize();
        head.lookAt(phys); head.camera.fov = 40;
      }, world);
    } else {
      const sp = await page.evaluate((p) => { const app = window.__app, cam = app.root.findByName('camera'); const V = cam.getPosition().constructor; const s = cam.camera.worldToScreen(new V(p.x, p.y, p.z)); return { x: s.x, y: s.y }; }, world);
      await page.mouse.move(sp.x, sp.y);
      at.screen = sp;
    }
    await wait(900);
    const file = `H2-${P.id}_${LABEL}_${mode}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    const before = await page.evaluate(() => { const q = window.__graceQueue(); return { mode: q.mode, surface: q.openSurface?.id ?? null, page: q.veraPage, pause: q.pauseOpen, offer: q.storyOffer, kit: q.kitPopin }; });
    // the press, where the ray / the mouse is
    if (xr) await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
    else { await page.mouse.down(); await wait(70); await page.mouse.up(); }
    await wait(1200);
    const after = await page.evaluate(() => { const q = window.__graceQueue(); return { mode: q.mode, surface: q.openSurface?.id ?? null, page: q.veraPage, pause: q.pauseOpen, offer: q.storyOffer, kit: q.kitPopin }; });
    await page.screenshot({ path: path.join(OUT, `H2-${P.id}_${LABEL}_${mode}-pressed.png`) });
    const cardOpened = after.surface !== before.surface && !!after.surface && !P.ritual;
    results.push({ panel: P.id, frame: P.frame, card: P.card, point: at, before, after, cardOpened, photo: file });
    console.log(`[${LABEL} ${mode}] ${P.id}: press on its body over ${P.card} → ${cardOpened ? 'THE CARD UNDER IT OPENED' : 'the panel kept it'} (${JSON.stringify(after)})`);
    if (xr) await page.evaluate(() => { const h = window.__app.root.findByName('camera'); h.setLocalEulerAngles(0, 0, 0); h.camera.fov = 90; });
    if (P.ritual) { await page.close(); break; }
  }
  fs.writeFileSync(path.join(OUT, `${LABEL}-${mode}.json`), JSON.stringify({ label: LABEL, mode, results, errors }, null, 1));
  if (!page.isClosed()) await page.close();
}
try { for (const m of MODES) await run(m); } finally { await browser.close(); }
