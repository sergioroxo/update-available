#!/usr/bin/env node
/**
 * ⚑ S386 (UiB job 24 Part A1) — NUALA'S MUG IS A QUIET PROP AGAIN, PRESSED THE WAY A VISITOR PRESSES IT.
 *
 *     node tools/s386-mug-probe.mjs --port 5341 [--out out/s386/probe-mug] [--mode desktop|xr|phone|all]
 *
 * His 14 Nov: "The mug I don't think it is needed to come to my face with it… It is just a mug." Checked, at the seat:
 *   · the mug is batched with the room again (no longer in cluster.ts UNBATCHED_IDS) and is not published as a press;
 *   · its sentence line before Nuala's message ("a mug, an N painted on it") and after ("Nuala's mug") — computer only;
 *   · a press on it (a real mouse; a controller ray + select in the emulated headset; a touch tap on the phone) does
 *     nothing: it stays where it stands, the notebook stays down, nothing on the platform changes;
 *   · her record closed by its own button → Nuala's message → read → the campaign kit comes at once (it no longer waits
 *     for the mug), and the mug never moves (sampled for the whole beat);
 *   · the notebook is untouched: a press still brings it to her hand and a press puts it down;
 *   · draw calls at the seat. Exit 1 on a failed check.
 */
import fs from 'node:fs';
import path from 'node:path';
import { installXrMock } from './harness/xr-mock.mjs';
import { readVisitorState } from './harness/visitor-state.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s386/probe-mug'));
const MODE = flag('mode', 'all');
const MODES = MODE === 'all' ? ['desktop', 'xr', 'phone'] : [MODE];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const puppeteer = (await import('puppeteer-core')).default;
fs.mkdirSync(OUT, { recursive: true });
const AIM = JSON.parse(fs.readFileSync('data/strings/aim.json', 'utf8'));
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required'] });
const checks = [];
const check = (mode, name, ok, extra = '') => { checks.push({ mode, name, ok: !!ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  [${mode}] ${name}${extra ? '  ' + extra : ''}`); };
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const SEAT = { x: -4.4, y: 1.16, z: 0.7, pitch: -8, yaw: 93 };

async function run(mode) {
  const xr = mode === 'xr', phone = mode === 'phone';
  const VW = phone ? 844 : 1280, VH = phone ? 390 : 720;
  const page = await browser.newPage();
  if (phone) await page.emulate({ userAgent: IPHONE_UA, viewport: { width: VW, height: VH, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: true } });
  else await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 2 });
  const errors = []; page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  let n = 0;
  const shot = (label) => page.screenshot({ path: path.join(OUT, `${mode}-${String(++n).padStart(2, '0')}-${label}.png`) });
  await page.goto(`http://localhost:${PORT}/?reinterp=1&era=3&debug=1&descent=0&kiosk=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__os && window.__app && window.__graceQueue?.() && window.__veraDesk, { timeout: 120000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic { display: none !important; }' });
  if (xr) {
    await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
    await installXrMock(page, 3);
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      window.__controller = src; app.xr.input.fire('add', src);
    });
  }
  await page.evaluate(() => { window.__v = (p) => (window.__app.xr.active ? window.__xrComfort.physicalPoint(p.clone()) : p); });
  await wait(6000);
  await page.evaluate(() => window.__graceQueue().debugBeat('board'));
  await page.waitForFunction(() => !window.__graceQueue().wickConducting, { timeout: 30000 }).catch(() => {});
  await wait(4000);
  await page.evaluate((s, xr) => window.__camFree(s.x, s.y, s.z, xr ? 0 : s.pitch, s.yaw), SEAT, xr); await wait(700);

  const proj = (w) => page.evaluate((w) => { const cam = window.__app.root.findByName('camera'), V = cam.getPosition().constructor; const s = cam.camera.worldToScreen(window.__v(new V(w.x, w.y, w.z)), new V()); return { x: s.x, y: s.y }; }, w);
  const tap = async (pt) => {
    if (phone) { await page.touchscreen.tap(pt.x, pt.y); return; }
    await page.mouse.move(pt.x, pt.y); await wait(80); await page.mouse.down(); await wait(70); await page.mouse.up();
  };
  const xrPress = async (w) => {
    await page.evaluate((w) => {
      const app = window.__app, head = app.root.findByName('camera'), V = head.getPosition().constructor;
      const phys = window.__xrComfort.physicalPoint(new V(w.x, w.y, w.z));
      const origin = head.getPosition().clone().add(head.right.clone().mulScalar(0.1)).add(head.up.clone().mulScalar(-0.25));
      window.__controller.getOrigin = () => origin.clone();
      window.__controller.getDirection = () => phys.clone().sub(origin).normalize();
    }, w);
    await wait(250); await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller)); await wait(120);
  };
  const pressWorld = async (w) => { if (xr) await xrPress(w); else await tap(await proj(w)); };
  const dbg = () => page.evaluate(() => window.__veraDeskDebug());
  const caption = () => page.evaluate(() => [...document.querySelectorAll('body > div')].filter((d) => d.style.opacity === '1').map((d) => d.textContent).join(' | '));
  const draws = () => page.evaluate(async () => { const a = []; for (let i = 0; i < 20; i++) { await new Promise(requestAnimationFrame); a.push(window.__drawCalls); } return Math.max(...a); });
  const mugPose = () => page.evaluate(() => { const m = window.__app.root.findByName('w_mug'); const p = m.getPosition(), r = m.getEulerAngles(), s = m.getLocalScale(); return [p.x, p.y, p.z, r.x, r.y, r.z, s.x].map((v) => Math.round(v * 1000) / 1000); });
  const platform = () => page.evaluate(() => { const q = window.__graceQueue(); return JSON.stringify({ mode: q.mode, page: q.veraPage, open: !!q.openSurface, kit: q.kitPopin, desk: q.deskConducting }); });
  const report = { mode };

  // ── the mug, a prop again ──
  const batched = await page.evaluate(() => {
    const m = window.__app.root.findByName('w_mug'), out = [];
    m.forEach((e) => { if (e.render) out.push({ name: e.name, group: e.render.batchGroupId }); });
    return out;
  });
  check(mode, 'the mug is batched with the room again (every part in a batch group)', batched.length > 0 && batched.every((b) => b.group !== -1 && b.group !== undefined), JSON.stringify(batched.slice(0, 4)));
  const t = await page.evaluate(() => window.__veraDesk());
  check(mode, 'only the notebook is published as a press on her desk (not the mug)', t.some((x) => x.id === 'desk-notebook') && !t.some((x) => x.id === 'desk-mug'), t.map((x) => x.id).join(', '));
  if (!xr) {
    const vs = await readVisitorState(page, { width: VW, height: VH });
    check(mode, 'the walker\'s map holds no mug', !vs.targets.some((x) => /mug/.test(x.id)) && !(vs.dropped || []).some((x) => /mug/.test(x.id)));
  }
  const d0 = await dbg(), mugAt = d0.mugAt, pose0 = await mugPose();
  check(mode, 'the mug is where it stood before S382 (room x −5.18, z 0.26)', Math.abs(pose0[0] - -5.18) < 0.02 && Math.abs(pose0[2] - 0.26) < 0.02, JSON.stringify(pose0));
  const mp = await proj(mugAt);
  check(mode, 'the mug is on screen from the seat', mp.x > 0 && mp.y > 0 && mp.x < VW && mp.y < VH, `${Math.round(mp.x)},${Math.round(mp.y)}`);
  report.drawsSeat = await draws();
  if (!xr && !phone) {
    await page.mouse.move(mp.x, mp.y); await wait(400);
    const cap = await caption();
    check(mode, 'before Nuala\'s message its sentence line is "a mug, an N painted on it"', cap.includes(AIM.veraMug) && !cap.includes(AIM.veraMugNuala), cap);
    await page.mouse.move(640, 80); await wait(200);
  }
  await shot('mug-at-rest');
  let p0 = await platform();
  await pressWorld(mugAt); await wait(1500);
  let d = await dbg(), pose = await mugPose(), p1 = await platform();
  check(mode, 'a press on the mug does nothing: it stays, the notebook stays down, the platform is unchanged', JSON.stringify(pose) === JSON.stringify(pose0) && d.notebook === 'rest' && !d.deskConducting && p0 === p1, `${JSON.stringify(pose)} · ${d.notebook} · ${p1}`);

  // ── Nuala's message, read: the kit comes at once, the mug never moves ──
  await page.evaluate(() => { const q = window.__graceQueue(); q.mode = 'board'; q.veraPage = 'record'; q.recordPage = 0; q.bump(); });
  await wait(900);
  let closed = false;
  if (!xr) {
    const vs = await readVisitorState(page, { width: VW, height: VH });
    const btn = vs.targets.find((x) => x.id === 'vera-record-close');
    if (btn) { await tap({ x: btn.pt[0], y: btn.pt[1] }); closed = true; }
  }
  if (!closed) await page.evaluate(() => { const q = window.__graceQueue(), r = q.rects.find((h) => h.id === 'vera-record-close'); if (r) q.handleClick(r.x + r.w / 2, r.y + r.h / 2); });
  const got = await page.waitForFunction(() => window.__graceQueue().phone.delivered('nuala'), { timeout: 60000 }).then(() => true, () => false);
  check(mode, 'her record closed: Nuala\'s message arrives', got);
  await wait(1200); await shot('nuala-message');
  const poses = new Set(); let kitAt = -1;
  const t0 = Date.now();
  for (let i = 0; i < 60; i++) {
    poses.add(JSON.stringify(await mugPose()));
    const s = await page.evaluate(() => { const q = window.__graceQueue(); return { kit: q.kitPopin || q.veraPage === 'kit', read: q.phone.delivered('nuala') && !q.phone.voiceBusy }; });
    if (s.kit && kitAt < 0) { kitAt = (Date.now() - t0) / 1000; await shot('kit-arrives-mug-at-rest'); break; }
    await wait(500);
  }
  report.kitAfterSeconds = kitAt;
  check(mode, 'once it is read the campaign kit comes (nothing waits for the mug)', kitAt >= 0, `kit after ${kitAt.toFixed(1)} s from the message`);
  check(mode, 'the mug never moved through the whole beat', poses.size === 1 && poses.has(JSON.stringify(pose0)), [...poses].join(' / '));
  await page.evaluate(() => { const q = window.__graceQueue(); q.kitPopin = false; if (q.veraPage === 'kit') q.veraPage = null; q.bump(); }); await wait(600);
  if (!xr && !phone) {
    await page.mouse.move(mp.x, mp.y); await wait(500);
    for (let k = 0; k < 20 && (await caption()).includes('['); k++) await wait(500);
    const cap = await caption();
    check(mode, 'after her message its sentence line is "Nuala\'s mug"', cap.includes(AIM.veraMugNuala), cap);
    await page.mouse.move(640, 80); await wait(200);
  }
  p0 = await platform();
  await pressWorld(mugAt); await wait(1500);
  d = await dbg(); pose = await mugPose(); p1 = await platform();
  check(mode, 'after her message too, a press on the mug does nothing', JSON.stringify(pose) === JSON.stringify(pose0) && d.notebook === 'rest' && p0 === p1, `${JSON.stringify(pose)} · ${d.notebook}`);
  await shot('mug-after');

  // ── the notebook, unchanged ──
  const nb = (await page.evaluate(() => window.__veraDesk())).find((x) => x.id === 'desk-notebook');
  if (nb) {
    await pressWorld(nb); await wait(1600);
    d = await dbg();
    check(mode, 'the notebook is untouched: a press still brings it to her hand', d.notebook === 'held', d.notebook);
    await shot('notebook-held');
    if (xr) await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
    else await tap({ x: VW / 2, y: VH / 2 });
    await wait(1500);
    d = await dbg();
    check(mode, '…and a press puts it down', d.notebook === 'rest', d.notebook);
  } else check(mode, 'the notebook is published', false);
  check(mode, 'no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.close();
  return report;
}

const results = [];
try { for (const m of MODES) results.push(await run(m)); } finally { await browser.close(); }
const failed = checks.filter((c) => !c.ok);
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ results, checks }, null, 1));
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed; draw calls at the seat: ${results.map((r) => `${r.mode} ${r.drawsSeat}`).join(', ')}`);
process.exit(failed.length ? 1 : 0);
