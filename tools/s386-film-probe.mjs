#!/usr/bin/env node
/**
 * ⚑ S386 (UiB job 24 Part A2) — RENATA'S FILM, MADE NEW, PRESSED THE WAY A VISITOR PRESSES IT.
 *
 *     node tools/s386-film-probe.mjs --port 5341 [--out out/s386/probe-film] [--mode desktop|xr|phone|all]
 *
 * `?reinterp=1&era=3&debug=1&descent=0&kiosk=0` (the default cut: the speedrun), the board settled (setup only). Every
 * press is a visitor's, at the control's place in the room: on the computer a real mouse (move, down, ~70 ms, up); in the
 * emulated headset a tracked controller's ray aimed at it and `select` (the first select calibrates the seat); on the
 * phone (844 × 390, isMobile, hasTouch) a real touch tap. Each control is measured from the seat (on screen, uncovered).
 * Checked:
 *   · her subtitles are her submission text WORD FOR WORD (the cues joined = `text`), and the minute is the sentence
 *     correction 3 cuts (0:12–0:32, the published film 0:20);
 *   · "Correct a testimony" opens her film AS SENT, large (its share of the window), and it PLAYS by itself (the canvas
 *     changes over time; the subtitle is the cue at the playhead);
 *   · Apply on correction 1: the cut is made in front of her (selected → struck → the platform's word typed in), Apply /
 *     Skip are withheld while it is made; afterwards the line reads "same-sex attracted" and not "lesbian";
 *   · Apply on correction 3: four cuts, one after another — the other hand (rose-sleeve pixels gone from the film), the
 *     second cup (its blue gone from where it stood), the photograph (its rose gone), the minute (the playhead JUMPS:
 *     no frame between 0:12 and 0:32 as sent; the film is 0:20 after);
 *   · Apply on correction 7: the story done, the published version plays (0:20, every cut made, the platform's caption
 *     on it); when it ends Vera's own 2014 cut comes on its own screen; Back opens the send page; Send works.
 *   · on the phone the refusal path: Skip three times on correction 1 → Lambient does it, and the cut is still made in
 *     front of her;
 *   · MEASURED: the subtitle's x-height in CSS px (computer, phone) and in degrees (headset); draw calls at the board,
 *     while the film plays and while a cut is made.
 * Writes report.json and photographs; exit 1 on any failed check. Needs a Vite dev server on --port.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s386/probe-film'));
const MODE = flag('mode', 'all');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const Q = JSON.parse(fs.readFileSync('data/dialog/s3_queue.json', 'utf8'));
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required'] });
const checks = [];
const check = (mode, name, ok, extra = '') => { checks.push({ mode, name, ok: !!ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  [${mode}] ${name}${extra ? '  ' + extra : ''}`); };
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

// ── the data, before any page: her words, word for word ──
{
  const sub = Q.submissions[0], v = sub.video;
  const joined = v.cues.map((c) => c.text).join(' ');
  check('data', 'the subtitles are her submission text word for word (cues joined = text)', joined === sub.text, joined === sub.text ? '' : joined);
  const c3 = Q.corrections.find((c) => c.id === 3), inMinute = v.cues.filter((c) => c3.edit.find.includes(c.text));
  const span = [Math.min(...inMinute.map((c) => c.from)), Math.max(...inMinute.map((c) => c.to))];
  check('data', 'the minute is the sentence correction 3 cuts: 0:12–0:32, so the published film is 0:20', span[0] === 12 && span[1] === 32 && inMinute.map((c) => c.text).join(' ') === c3.edit.find, JSON.stringify(span));
  check('data', 'correction 1 cuts the subtitle (term); correction 3 the hand, the cup, the photo and the minute; 7 nothing',
    JSON.stringify(Q.corrections.find((c) => c.id === 1).film) === '["term"]' && JSON.stringify(c3.film) === '["hand","mug","photo","minute"]' && !Q.corrections.find((c) => c.id === 7).film);
  check('data', 'Renata carries corrections 1, 3, 7 (his "~3 presses")', JSON.stringify(sub.corrections) === '[1,3,7]');
}

async function run(mode) {
  const xr = mode === 'xr', phone = mode === 'phone';
  const VW = phone ? 844 : 1280, VH = phone ? 390 : 720;
  const page = await browser.newPage();
  if (phone) await page.emulate({ userAgent: IPHONE_UA, viewport: { width: VW, height: VH, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: true } });
  else await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  let n = 0;
  const shot = async (label) => { await page.screenshot({ path: path.join(OUT, `${mode}-${String(++n).padStart(2, '0')}-${label}.png`) }); };
  await page.goto(`http://localhost:${PORT}/?reinterp=1&era=3&debug=1&descent=0&kiosk=0`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.__graceQueue?.() && window.__app && window.__camPose, { timeout: 180000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic { display: none !important; }' });
  await wait(4500);
  if (xr) {
    await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      window.__controller = src; app.xr.input.fire('add', src);
    });
    await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));   // the first select calibrates the seat
    await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
    await wait(1500);
    await page.evaluate(() => { const a = window.__app; a.on('update', () => { const d = a.root.findByName('xr-debug'); if (d) d.enabled = false; }); });
  }
  // setup (not under test): the board, the shift's first conduction beats already said, the guide quiet
  await page.evaluate(() => { const q = window.__graceQueue(); q.debugBeat('board'); q.seenTask = true; q.wotdSaid = true; q.waitSaid = true; q.lambLines = null; q.lambPriority = false; q.lambyGuide = null; q.bump(); });
  await wait(1500);
  const q = (fn, arg) => page.evaluate(fn, arg);
  const film = () => q(() => { const g = window.__graceQueue(); return { ...(g.filmState ?? {}), mode: g.mode, page: g.veraPage, current: g.current?.()?.id ?? null, ids: g.rects.map((r) => r.id) }; });
  const draws = () => q(async () => { const a = []; for (let i = 0; i < 20; i++) { await new Promise(requestAnimationFrame); a.push(window.__drawCalls); } return { min: Math.min(...a), max: Math.max(...a) }; });

  /** where a control is: its rect on the workstation canvas → the world → the screen */
  const locate = (id, nth = 0) => q(({ id, nth, VW, VH }) => {
    const g = window.__graceQueue(), app = window.__app;
    const r = g.rects.filter((k) => k.id === id)[nth]; if (!r) return null;
    const ent = app.root.findByName('era3-device-workstation'); const m = ent.getWorldTransform().data;
    const u = (r.x + r.w / 2) / 676 - 0.5, v = (r.y + r.h / 2) / 390 - 0.5;
    const w = { x: m[12] + u * m[0] + v * m[8], y: m[13] + u * m[1] + v * m[9], z: m[14] + u * m[2] + v * m[10] };
    let cam = null; app.root.forEach((e) => { if (e.camera && e.enabled) cam = e; });
    const V = app.root.getPosition().constructor;
    const p = cam.camera.worldToScreen(new V(w.x, w.y, w.z));
    const onScreen = p.z > 0 && p.x > 4 && p.y > 4 && p.x < VW - 4 && p.y < VH - 4;
    const el = onScreen ? document.elementFromPoint(p.x, p.y) : null;
    return { world: w, screen: { x: p.x, y: p.y }, onScreen, covered: el && el.tagName !== 'CANVAS' ? el.tagName + ' ' + (el.textContent || '').trim().slice(0, 30) : null, rect: { x: r.x, y: r.y, w: r.w, h: r.h } };
  }, { id, nth, VW, VH });

  /** a press as the visitor makes it */
  const press = async (id, nth = 0, settle = 700) => {
    const at = await locate(id, nth);
    if (!at) { check(mode, `control "${id}" is published`, false); return false; }
    if (!xr && (!at.onScreen || at.covered)) { check(mode, `"${id}" is on screen from the seat`, false, JSON.stringify(at.screen) + (at.covered ? ' covered by ' + at.covered : '')); return false; }
    if (xr) {
      await page.evaluate((p) => {
        const app = window.__app, head = app.root.findByName('camera'), c = window.__xrComfort;
        const origin = head.getPosition().clone().add(head.right.clone().mulScalar(0.12)).add(head.up.clone().mulScalar(-0.25));
        const target = c.physicalPoint(origin.clone().set(p.x, p.y, p.z));
        window.__controller.getOrigin = () => origin;
        window.__controller.getDirection = () => target.clone().sub(origin).normalize();
      }, at.world);
      await wait(200);
      await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
    } else if (phone) await page.touchscreen.tap(at.screen.x, at.screen.y);
    else { await page.mouse.move(at.screen.x, at.screen.y); await wait(60); await page.mouse.down(); await wait(70); await page.mouse.up(); }
    await wait(settle);
    return true;
  };

  /** the workstation canvas as the platform draws it now: pixels near `hex` inside `rect` */
  const count = (rect, hex, tol = 10) => q(({ rect, hex, tol }) => {
    const g = window.__graceQueue(), c = document.createElement('canvas'); c.width = 676; c.height = 390;
    const x = c.getContext('2d'); g.draw(x, 676, 390);
    const rx = Math.max(0, Math.round(rect.x)), ry = Math.max(0, Math.round(rect.y)), rw = Math.max(1, Math.round(rect.w)), rh = Math.max(1, Math.round(rect.h));
    const d = x.getImageData(rx, ry, rw, rh).data, R = parseInt(hex.slice(1, 3), 16), G = parseInt(hex.slice(3, 5), 16), B = parseInt(hex.slice(5, 7), 16);
    let k = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - R) <= tol && Math.abs(d[i + 1] - G) <= tol && Math.abs(d[i + 2] - B) <= tol) k++;
    return k;
  }, { rect, hex, tol });
  const filmHash = () => q(() => {
    const g = window.__graceQueue(), r = g.filmState?.rect; if (!r) return null;
    const c = document.createElement('canvas'); c.width = 676; c.height = 390; const x = c.getContext('2d'); g.draw(x, 676, 390);
    const d = x.getImageData(r.x, r.y, r.w, r.h).data; let h = 0; for (let i = 0; i < d.length; i += 16) h = (h * 31 + d[i] + d[i + 1] * 7 + d[i + 2] * 13) >>> 0; return h;
  });
  /** a film-unit rect of the scene → canvas pixels, as the film module maps it */
  // the sleeve's own stretch of table (film units), clear of the curtains and of Renata's mug, which share its rose
  const SLEEVE = { x: 0, y: 92, w: 140, h: 48 };
  const targetRect = (name) => q(async ({ name, SLEEVE }) => {
    const m = await import('/src/desktop/theme/renataFilm.ts'), g = window.__graceQueue(), st = g.filmState;
    const r = m.filmToCanvas(name === 'sleeve' ? SLEEVE : m.FILM_TARGETS[name], st.rect.x, st.rect.y, st.rect.w, st.rect.h, st.frame.crop);
    const x0 = Math.max(st.rect.x, r.x), y0 = Math.max(st.rect.y, r.y), x1 = Math.min(st.rect.x + st.rect.w, r.x + r.w), y1 = Math.min(st.rect.y + st.rect.h, r.y + r.h);
    return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
  }, { name, SLEEVE });
  /** the subtitle's x-height, seen from the seat: CSS px on a screen, degrees in the headset */
  const measureSubtitle = () => q(async () => {
    const F = await import('/src/desktop/theme/fonts.ts'), g = window.__graceQueue(), app = window.__app, r = g.filmState.rect;
    const c = document.createElement('canvas').getContext('2d');
    const G = await import('/src/room/graceQueueLite.ts');
    c.font = `600 ${F.textPx(G.SUBTITLE_PX, 'e3')}px ${F.sansFor('e3')}`;
    const xh = c.measureText('x').actualBoundingBoxAscent;
    c.font = `${F.textPx(10, 'e3')}px ${F.sansFor('e3')}`;
    const xh10 = c.measureText('x').actualBoundingBoxAscent;
    const ent = app.root.findByName('era3-device-workstation'); const m = ent.getWorldTransform().data;
    const V = app.root.getPosition().constructor;
    const world = (cu, cv) => { const u = cu / 676 - 0.5, v = cv / 390 - 0.5; return new V(m[12] + u * m[0] + v * m[8], m[13] + u * m[1] + v * m[9], m[14] + u * m[2] + v * m[10]); };
    const phys = (p) => (app.xr.active && window.__xrComfort ? window.__xrComfort.physicalPoint(p.clone()) : p);
    let cam = null; app.root.forEach((e) => { if (e.camera && e.enabled) cam = e; });
    const cx = r.x + r.w / 2, cy = r.y + r.h - 18;
    const a = phys(world(cx, cy)), b = phys(world(cx, cy + xh)), b10 = phys(world(cx, cy + xh10));
    const sa = cam.camera.worldToScreen(a), sb = cam.camera.worldToScreen(b), sb10 = cam.camera.worldToScreen(b10);
    const eye = cam.getPosition(), dist = a.distance(eye);
    const deg = (p, q2) => 2 * Math.atan(p.distance(q2) / 2 / dist) * 180 / Math.PI;
    return { xhUnits: xh, px: Math.abs(sb.y - sa.y), px10: Math.abs(sb10.y - sa.y), deg: deg(a, b), deg10: deg(a, b10), dist, filmW: r.w, filmH: r.h, share: r.w / 472 };
  });

  const report = { mode };
  report.drawsBoard = await draws();

  // ── open her job: the film, as sent, large, playing ──
  await press('task-0', 0, 1200);
  let f = await film();
  check(mode, '"Correct a testimony" opens her film AS SENT, and it plays by itself', f.view === 'sent' && f.playing === true, `view ${f.view} playing ${f.playing}`);
  const fl = await locate('video', 0);
  check(mode, 'her film is on screen from the seat (its centre)', !!fl && (xr || fl.onScreen), fl ? `${Math.round(fl.screen.x)},${Math.round(fl.screen.y)}` : '');
  report.subtitle = await measureSubtitle();
  if (phone) {
    // the phone's pinch is its lean: measured again at the narrowest field of view (30°), the room unchanged
    report.subtitleZoomed = await q(() => { const cam = window.__app.root.findByName('camera'); window.__fov0 = cam.camera.fov; cam.camera.fov = 30; return cam.camera.fov; }).then(() => measureSubtitle());
    report.fovHome = await q(() => { const cam = window.__app.root.findByName('camera'), f0 = window.__fov0; cam.camera.fov = f0; return f0; });
  }
  check(mode, `the film fills the window: ${report.subtitle.filmW}×${report.subtitle.filmH} canvas px, ${Math.round(report.subtitle.share * 100)}% of GracePlatform's width`, report.subtitle.share >= 0.55);
  if (xr) check(mode, `subtitle x-height ${report.subtitle.deg.toFixed(2)}° in the headset (≥ 0.6°; the platform's 10 px text ${report.subtitle.deg10.toFixed(2)}°)`, report.subtitle.deg >= 0.6);
  else if (phone) check(mode, `subtitle x-height ${report.subtitle.px.toFixed(1)} CSS px at the home view (${report.fovHome}°), ${report.subtitleZoomed.px.toFixed(1)} px at the narrowest pinch (30°); the platform's 10 px text ${report.subtitle.px10.toFixed(1)} / ${report.subtitleZoomed.px10.toFixed(1)}`, report.subtitleZoomed.px >= 5.5);
  else check(mode, `subtitle x-height ${report.subtitle.px.toFixed(1)} CSS px (the platform's 10 px text ${report.subtitle.px10.toFixed(1)})`, report.subtitle.px >= 6);
  const h0 = await filmHash(); await wait(1300); const h1 = await filmHash(); f = await film();
  check(mode, 'it moves: the film\'s pixels change as it plays, and the subtitle is the cue at the playhead', h0 !== h1 && !!f.cue && f.subtitle === f.cue, `t ${f.playT?.toFixed(1)} · "${f.subtitle}"`);
  report.drawsPlaying = await draws();
  await q(() => { const g = window.__graceQueue(); g.playT = 6; g.bump(); }); await wait(400);   // the other hand on hers (shown, not pressed)
  await shot('film-as-sent');
  const sleeveRect = await targetRect('sleeve'), mugRect = await targetRect('mug'), photoRect = await targetRect('photo');
  const before = { rose: await count(sleeveRect, '#d4a0a0'), blue: await count(mugRect, '#7fbef0'), photo: await count(photoRect, '#d2607e') };
  check(mode, 'as sent, the picture holds her girlfriend\'s rose sleeve, the blue second mug and the photograph of two', before.rose > 50 && before.blue > 50 && before.photo > 10, JSON.stringify(before));

  // ── correction 1: Soften the term ──
  if (phone) {
    // the refusal path: Skip, Skip, Skip — Lambient does it, and the cut is still made in front of her
    await press('skip'); await press('skip');
    f = await film();
    check(mode, 'Skip twice on "Soften the term": the rule stays open, nothing is cut', f.current === 1 && f.cuts.term === 0 && f.view === 'sent', `current ${f.current}`);
    await press('skip', 0, 300);
  } else await press('apply', 0, 300);
  f = await film();
  check(mode, phone ? 'the third Skip: Lambient does it — and the cut is made in front of her' : 'Apply on "Soften the term": the cut begins in front of her (the word selected)', f.view === 'cutting' && f.cutting?.kind === 'term', JSON.stringify(f.cutting));
  check(mode, 'while it is made, Apply / Skip are withheld (and the film is not pressable)', !f.ids.includes('apply') && !f.ids.includes('skip') && !f.ids.includes('video'));
  check(mode, 'the film is held on her line with the word in it', /lesbian/.test(f.cue ?? ''), f.cue);
  await shot('c1-selected');
  report.drawsCutting = await draws();
  await page.waitForFunction(() => window.__graceQueue().filmState?.cutting?.phase === 'hold', { timeout: 8000 }).catch(() => {});
  f = await film();
  const runs = f.subtitleRuns ?? [];
  check(mode, '…struck, and the platform\'s word typed in its place', runs.some((r) => r.state === 'cut' && r.text === 'lesbian') && runs.some((r) => r.state === 'added' && r.text.trim() === 'same-sex attracted'), JSON.stringify(runs));
  await shot('c1-struck');
  await page.waitForFunction(() => !window.__graceQueue().filmState?.cutting, { timeout: 8000 }).catch(() => {});
  f = await film();
  check(mode, 'the cut made: the line now says "same-sex attracted", not "lesbian"; the film plays on; Apply is back', f.cuts.term === 1 && /same-sex attracted/.test(f.subtitle) && !/lesbian/.test(f.subtitle) && f.playing && f.ids.includes('apply'), `"${f.subtitle}"`);

  // ── correction 3: Name the dependency, not the person — four cuts ──
  await press('apply', 0, 200);
  f = await film();
  check(mode, 'Apply on "Name the dependency, not the person": four cuts queued — the hand, the cup, the photo, the minute', JSON.stringify(f.queue) === '["hand","mug","photo","minute"]', JSON.stringify(f.queue));
  await shot('c3-hand-selected');
  const seen = { order: [], sent: [] };
  let lastKind = null;
  for (let i = 0; i < 160; i++) {
    const s = await film();
    if (!s.cutting) break;
    if (s.cutting.kind !== lastKind) { seen.order.push(s.cutting.kind); lastKind = s.cutting.kind; }
    if (s.cutting.kind === 'minute') seen.sent.push(Math.round(s.sentT * 10) / 10);
    if (s.cutting.kind === 'hand' && s.cutting.phase === 'change' && !seen.handShot && s.cutting.p > 0.3) { seen.handShot = true; await shot('c3-hand-leaving'); }
    if (s.cutting.kind === 'mug' && s.cutting.phase === 'change' && !seen.mugShot) { seen.mugShot = true; await shot('c3-cup-going'); }
    if (s.cutting.kind === 'photo' && s.cutting.phase === 'hold' && !seen.photoShot) { seen.photoShot = true; await shot('c3-photo-blurred'); }
    if (s.cutting.kind === 'minute' && s.sentT >= 31.5 && !seen.jumpShot) { seen.jumpShot = true; await shot('c3-minute-jumped'); }
    await wait(90);
  }
  check(mode, 'the four are made one after another, in that order', JSON.stringify(seen.order) === '["hand","mug","photo","minute"]', JSON.stringify(seen.order));
  const between = seen.sent.filter((t) => t > 12.6 && t < 31.5);
  check(mode, 'the playhead JUMPS the minute: it reaches 0:12 and the next frame is 0:32 (none between)', seen.sent.some((t) => t <= 12.1 && t >= 11) && seen.sent.some((t) => t >= 31.9) && between.length === 0, `sent times seen: ${[...new Set(seen.sent)].join(', ')}`);
  f = await film();
  await q(() => { const g = window.__graceQueue(); g.playT = 6; g.bump(); }); await wait(300);
  f = await film();
  const sleeveR2 = await targetRect('sleeve'), mugR2 = await targetRect('mug'), photoR2 = await targetRect('photo');
  const after = { rose: await count(sleeveR2, '#d4a0a0'), blue: await count(mugR2, '#7fbef0'), photo: await count(photoR2, '#d2607e') };
  check(mode, 'after: no rose sleeve where it lay, no blue cup where it stood, no one in the photograph', after.rose === 0 && after.blue === 0 && after.photo === 0, JSON.stringify(after));
  check(mode, 'the film is 0:20 now, cropped in, every cut made', f.seconds === 20 && f.frame.crop === 1 && Object.values(f.cuts).every((v) => v === 1), `seconds ${f.seconds} crop ${f.frame.crop}`);
  await shot('c3-made');

  // ── correction 7, the story done: the published version, then Vera's own cut on its own screen ──
  await press('apply', 0, 600);
  f = await film();
  check(mode, 'Apply on "Route for mentorship" cuts nothing; the story is done and the PUBLISHED version plays from 0:00', f.view === 'published' && f.playing && f.playT < 2 && f.seconds === 20, `view ${f.view} t ${f.playT?.toFixed(1)}`);
  const banner = await count({ x: f.rect.x, y: f.rect.y, w: Math.round(f.rect.w * 0.6), h: 30 }, '#2f86d8', 6);
  check(mode, 'the platform\'s caption is on it ("Free from dependency", its blue band)', banner > 200, `${banner} px`);
  await q(() => { const g = window.__graceQueue(); g.playT = 4; g.bump(); }); await wait(300);
  await shot('published');
  // let it run to its end (the last few seconds of it, in real time)
  await q(() => { const g = window.__graceQueue(); g.playT = 17.5; g.bump(); });
  const ended = await page.waitForFunction(() => window.__graceQueue().filmState?.view === 'own', { timeout: 9000 }).then(() => true, () => false);
  check(mode, 'when it ends, Vera\'s own 2014 cut comes, on its own screen (no press, no look)', ended);
  await wait(400); await shot('vera-2014');
  await press('board-back', 0, 1600);
  f = await film();
  check(mode, 'Back to Today: the send page (the platform\'s version, four places)', f.page === 'send', `page ${f.page}`);
  await shot('send');
  await press('vera-send', 0, 900); f = await film();
  check(mode, 'Send to all four works', f.ids.includes('vera-send-close'));
  await press('vera-send-close', 0, 900); f = await film();
  check(mode, 'and the day goes on', f.page === null && (f.mode === 'board' || f.mode === 'done'));
  check(mode, 'no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  report.errors = errors;
  await page.close();
  return report;
}

const modes = MODE === 'all' ? ['desktop', 'xr', 'phone'] : [MODE];
const results = [];
try { for (const m of modes) results.push(await run(m)); } finally { await browser.close(); }
const failed = checks.filter((c) => !c.ok);
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ results, checks }, null, 1));
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
for (const r of results) console.log(`${r.mode}: draws board ${r.drawsBoard.min}–${r.drawsBoard.max}, playing ${r.drawsPlaying?.min}–${r.drawsPlaying?.max}, cutting ${r.drawsCutting?.min}–${r.drawsCutting?.max}; subtitle x-height ${r.subtitle ? (r.mode === 'xr' ? r.subtitle.deg.toFixed(2) + '°' : r.subtitle.px.toFixed(1) + ' px') : '?'} (10 px text ${r.subtitle ? (r.mode === 'xr' ? r.subtitle.deg10.toFixed(2) + '°' : r.subtitle.px10.toFixed(1) + ' px') : '?'}), film ${r.subtitle?.filmW}×${r.subtitle?.filmH}`);
process.exit(failed.length ? 1 : 0);
