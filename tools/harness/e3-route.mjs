/**
 * ⚑ S428 (UiB job 38) — 2016 PLAYED BY PRESSES, for the probes (tools/s428-chain-probe.mjs, tools/s428-stall-probe.mjs,
 * tools/s428-stills.mjs). Real mouse presses on the build's own published targets (tools/harness/visitor-state.mjs, as the walker
 * aims), and the fiction's own times run FASTER than real time through the app's own update loop: `ff(page, s)` calls
 * `window.__app.update(0.1)` s × 10 times in one go (the engine clamps a frame to 0.1 s; nothing is rendered meanwhile, every
 * per-frame clock in the piece advances exactly as in play).
 *
 * `playTo(page, goal)` is goal-driven, so it runs on the build before job 38 (5185e4f1: the conducted chain opens things by itself)
 * and after it (the chain waits for her): at each step it presses what a visitor would press next — sign in, Allow, Begin, the
 * lessons' own controls, a message's notification, Look back, Close, the Notes, Nuala's card, the group — and lets the fiction's
 * own time run between presses. It never uses a debug jump.
 */
import puppeteer from 'puppeteer-core';
import { readVisitorState } from './visitor-state.mjs';

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
/** the look-mode the page was launched in: 'desktop' (a mouse), 'xr' (the headset mock: a controller ray and its trigger), 'phone' (a tap) */
let MODE = 'desktop';

export async function launch(port, { width = 1280, height = 720, scale = 1, query = '', mode = 'desktop', hidePlate = true, init = null } = {}) {
  MODE = mode;
  if (mode === 'phone') { width = 390; height = 844; }
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 180000, protocolTimeout: 900000,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required', '--disable-audio-output'],
    defaultViewport: { width, height, deviceScaleFactor: scale }
  });
  const page = await browser.newPage();
  if (mode === 'phone') await page.emulate({ userAgent: IPHONE_UA, viewport: { width, height, deviceScaleFactor: 3, isMobile: true, hasTouch: true, isLandscape: false } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 240)); });
  if (init) await page.evaluateOnNewDocument(init);   // ⚑ S429 — a probe's own hooks, before the page's scripts (the music probe wraps Web Audio)
  await page.goto(`http://localhost:${port}/?reinterp=1&kiosk=0&era=3&debug=1&descent=0${query}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__graceQueue?.() && window.__app && window.__os && window.__camPose, { timeout: 180000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic, #debug-toggle { display: none !important; }' });
  await wait(3000);
  await page.evaluate(() => document.querySelectorAll('button').forEach((b) => { if ((b.textContent || '').startsWith('⚙')) b.style.visibility = 'hidden'; }));
  if (mode === 'xr') {
    // ⚑ the headset mock (out/j33-sweep.mjs, tools/s426-act3-stills.mjs): xr.active, the head at the seat's head height, fov 90, a
    //   controller added (its ray aimed at the target for a press), the first select calibrates the seat, the debug plate hidden
    await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
    await page.evaluate((hide) => {
      const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
      window.__aim = null;
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(),
        getDirection: () => (window.__aim ? window.__aim.clone() : head.forward.clone()), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      window.__controller = src; app.xr.input.fire('add', src);
      const w2s = head.camera.worldToScreen.bind(head.camera);
      head.camera.worldToScreen = (w, out) => w2s(window.__xrComfort?.physicalPoint ? window.__xrComfort.physicalPoint(w.clone()) : w, out);
      if (hide) app.on('update', () => { const d = app.root.findByName('xr-debug'); if (d) d.enabled = false; });
    }, hidePlate);
    await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
    await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
    await wait(1500);
  }
  return { browser, page, errors, view: { width, height } };
}

/** the fiction's own time, faster than real time: `s` seconds of the app's own update loop, in 0.1 s frames */
export const ff = (page, s) => page.evaluate((sec) => {
  const a = window.__app; const n = Math.round(sec * 10);
  for (let i = 0; i < n; i++) a.update(0.1);
  return n;
}, s);

/** what 2016 is doing, read off the live objects (read only) */
export const e3 = (page) => page.evaluate(() => {
  const q = window.__graceQueue?.(), p = q?.phone, os = window.__os;
  if (!q) return null;
  const c = q.chainState ?? null;
  return {
    mode: q.mode, page: q.veraPage ?? null, job: q.openSurface?.id ?? (q.mode === 'list' ? 'testimony' : null), week: !!q.pauseOpen,
    watch: !!q.watch, storyDone: !!q.storyDone, minimised: !!q.minimised, card: q.memoryCard ?? null, declined: !!q.memoryDeclined,
    memoryStage: q.memoryStage, kitPopin: !!q.kitPopin, kitApproved: !!q.kitApproved, takenDown: !!q.takenDown,
    phone: p ? { screen: p.screen, stage: p.stage, notice: p.noticeId ?? (p.notice?.id ?? null), banner: p.banner ? `${p.banner.from}: ${p.banner.text}`.slice(0, 60) : null,
      delivered: (p.evening || []).map((e) => e.id), newsN: p.newsN, conducting: !!p.conductingNotes, written: !!p.refusalWritten,
      notesClosed: !!p.notesClosed, end: p.endAnswered ?? null, removed: [...(p.removed || [])].length, cascadeN: p.cascadeN, clock: p.eveningClock } : null,
    floppy: !!q.floppy?.open, chain: c ? c.step : null, take: c?.take ?? null, now: c ? `${c.label} — ${c.hint}` : null,
    update: !!(os.updateApp && os.updateApp.visible), updatePhase: os.updateApp?.phase ?? null,
    lessons: ['testimony', 'places', 'family'].map((id) => { try { return q.lessonState(id); } catch { return '?'; } }),
    guide: { tray: !!(q.lambyGuidePaint && window.__os?.lambyGuide), askable: q.guideAskable ?? null, askOnly: q.guideAskOnly ?? null, balloon: !!q.lambyGuidePaint?.balloon,
      text: window.__os?.lambyGuide?.active ? window.__os.lambyGuide.view.text : null },
    mapNow: window.__os?.desktopEra === 'e3' ? null : null,
    records: (window.__ledger?.()?.records || []).filter((r) => r.startsWith('e3')),
    jobs: (window.__ledger?.()?.era3Jobs || []).map((j) => j.id)
  };
});

export const targets = async (page, view) => (await readVisitorState(page, view)).targets;

/** a real press on a published target (the walker's own aim) — false if it is not live */
export async function press(page, view, id, log) {
  const t = (await targets(page, view)).find((x) => x.id === id);
  if (!t) return false;
  const [x, y] = t.pt;
  if (MODE === 'xr') {
    await page.evaluate((px, py) => {
      const app = window.__app, head = app.root.findByName('camera'), far = head.camera.screenToWorld(px, py, 5), o = head.getPosition();
      window.__aim = far.clone().sub(o).normalize();
      const c = window.__controller; app.xr.input.fire('selectstart', c); app.xr.input.fire('select', c); app.xr.input.fire('selectend', c);
    }, x, y);
    await wait(120);
    await page.evaluate(() => { window.__aim = null; });
  } else if (MODE === 'phone') await page.touchscreen.tap(x, y);
  else { await page.mouse.move(x, y); await page.mouse.down(); await wait(70); await page.mouse.up(); }
  await wait(120);
  log?.(`press ${id}`);
  return true;
}

/**
 * Plays 2016 by presses until `goal(state)` is true (or `limit` steps pass). `opts.heartwood` 'notnow' answers Lamby's offer.
 * Returns the state at the goal. On both builds.
 */
export async function playTo(page, view, goal, { limit = 400, log = () => {}, heartwood = 'notnow' } = {}) {
  for (let step = 0; step < limit; step++) {
    const s = await e3(page);
    if (goal(s)) return s;
    const live = new Map((await targets(page, view)).map((t) => [t.id, t]));
    const has = (id) => live.has(id);
    const go = async (id) => { if (has(id)) { await press(page, view, id, log); await ff(page, 0.6); return true; } return false; };
    // Lamby's Heartwood offer (the set's card, in view)
    if (await go(heartwood === 'notnow' ? 'lg-later@call' : 'lg-take@call')) continue;
    // a balloon of Lambient's on the glass (asked for, or a tip) is put away first: its body covers what is under it
    if (s.guide?.balloon && (await go('lg-ok') || await go('lg-later') || await go('lg-x'))) continue;
    if (s.update) { await ff(page, 1); continue; }
    if (s.mode === 'signin') { if (await go('signin')) continue; }
    if (s.mode === 'consent') { if (await go('consent-allow')) continue; }
    if (s.week) { if (await go('week-begin') || await go('pause-close')) continue; }
    if (s.page === 'record') { if (await go('memory-close')) continue; await ff(page, 2); continue; }
    if (s.page === 'kit') { if (await go('vera-kit-approve') || await go('vera-kit-close')) continue; }
    if (s.card) { if (await go('memory-look')) continue; }
    if (s.kitPopin && s.mode === 'board' && !s.job) { if (await go('kit-popin-open')) continue; }
    if (s.mode === 'list') {
      if (s.watch) { await ff(page, 2); continue; }
      if (s.job === 'testimony') { if (await go('apply') || await go('vera-send') || await go('board-back')) continue; }
      if (s.job === 'places') { if (await go('places-add') || await go('board-back')) continue; }
      if (s.job === 'family') {
        // Lesson 3: Lambient answers Maureen first (its own time), then Annette is hers
        const sel = await page.evaluate(() => { const f = window.__graceQueue().surfaces.get('family'); return { sel: f.sel, moved: !!f.lessonMoved, done: f.complete() }; });
        if (sel.done) { if (await go('board-back')) continue; await ff(page, 1); continue; }
        if (!sel.moved) { if (sel.sel !== 0 && await go('family-sel-0')) continue; await ff(page, 2); continue; }
        if (sel.sel !== 1 && await go('family-sel-1')) continue;
        if (await go('family-reply-r_grief')) continue;
        log(`family: no reply live (${[...live.keys()].filter((k) => k.startsWith('family')).join(',')})`);
        await ff(page, 1); continue;
      }
      if (await go('board-back')) continue;
    }
    if (s.mode === 'board' || s.mode === 'done') {
      // the next lesson
      const lit = s.lessons.findIndex((l) => l === 'lit');
      if (lit >= 0 && await go('task-' + lit)) continue;
    }
    // her phone: what waits there (the after build waits for these presses; the before build opens most by itself)
    const p = s.phone;
    if (p) {
      if (p.screen === 'notes' && p.written && !p.notesClosed && await go('mirror:back')) continue;
      if (p.notice && (await go('mirror:evening-banner') || await go('mirror:lock-notice'))) continue;
      const fourDone = s.records.includes('e3-job:family');
      if (fourDone && p.delivered.includes('decision') && !s.card && s.memoryStage === 'idle' && !s.declined && s.page !== 'record'
        && !(await page.evaluate(() => window.__graceQueue().phone.readFor?.('decision') >= 0))
        && (await go('mirror:lock-card:Mam') || await go('mirror:evening-banner') || await go('mirror:evening:Mam'))) continue;
      if (p.delivered.includes('nuala') && ['lock', 'done'].includes(s.memoryStage) && p.stage === 'quiet'
        && !(await page.evaluate(() => (window.__graceQueue().phone.readFor?.('nuala') ?? -1) >= 0 || window.__graceQueue().phone.screen === 'evening'))
        && (await go('mirror:lock-card:Nuala') || await go('mirror:evening-banner'))) continue;
    }
    await ff(page, 1);
  }
  return e3(page);
}
