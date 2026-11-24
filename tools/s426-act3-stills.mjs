#!/usr/bin/env node
/**
 * ⚑ S426 (UiB job 35 Part D, Act III) — 2016's ACT III (Malta), photographed in order from the seat: S424's route through the
 * training and S425's memory (tools/s425-act2-stills.mjs, copied whole), then on to the update notification — today's build:
 * Nuala, the URGENT kit, the kit, Take my story down, Bea's news on the Handset Window, the blank article, the PRIORITY ALERT,
 * "finally. about time x", the Review page, the removals, the forwards, "4 items could not be reviewed", Orla's last message,
 * Lambient's last lines; the storyboard's (S426): the group wide in the board's place (Bea, the card with its fact line,
 * Susan, Hanne), the light lifting, the group back in its column, the URGENT kit ("GracePlatform chose your story."), the kit,
 * Take my story down or Approve, the group wide again with the platform's bar, each Malta message outlined, "removing…",
 * greyed and folded, the forwards, "Review could not keep up.", her forward (with --forward yes), the thread held, the update.
 *
 *     node tools/s426-act3-stills.mjs --port 5681 --out out/s426/after-desktop --mode desktop --forward yes
 *     node tools/s426-act3-stills.mjs --port 5682 --out out/s426/before-phone --mode phone
 *
 * `--forward yes|no` (default no): press "↪ Forward the link" once when it is offered (the storyboard's build only).
 * `--kit down|approve` (default down): the one kit choice pressed (Take my story down, or Approve kit), then Back to today.
 * `--heartwood bring|notnow` (default notnow) and `--memory look|notnow|wait` as S425's tool.
 *
 * (S425's and S424's notes on the route follow.)
 *
 * `--memory look` (the default): Look back at once, See what you wrote after its reading pause, and Close only once Nuala's
 * message has landed (so the Notes are photographed over the page). `--memory notnow`: Not now first, then Look back on the
 * card that comes back. `--memory wait`: Look back, then nothing pressed on the page (her words come by themselves).
 *
 * A REVIEW ROUTE, never a reachability proof (tools/walk.mjs is that). It boots `?era=3` as the stills do, then presses only
 * what a visitor presses, with the build's own targets (tools/harness/visitor-state.mjs): on the computer a real mouse press,
 * on the phone a real tap, in the headset mock the controller's ray aimed at the target and its trigger fired. No debug
 * jump, no debugBeat, no state written. Between presses it dwells as a reader would and lets every timed beat run.
 *
 * It photographs every new state once it has held still, and every few seconds while the group is on the Handset Window, and
 * writes `log.json` (each still, its time from Allow, its draw calls). Its Act III recorder (measurement only) gives the draw-
 * call peak in each Act III stage and, while the review runs, how often the monitor changed and was uploaded (worst 1 s).
 * It stops once the update notification has held still for 2.5 s.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { readVisitorState } from './harness/visitor-state.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const MODE = flag('mode', 'desktop');
const XR = MODE === 'xr', PHONE = MODE === 'phone';
const OUT = path.resolve(flag('out', `out/s426/${MODE}`));
const FORWARD = flag('forward', 'no') === 'yes' ? 'yes' : 'no';
const KIT = flag('kit', 'down') === 'approve' ? 'approve' : 'down';
const MEMORY = ['notnow', 'wait'].includes(flag('memory', 'look')) ? flag('memory', 'look') : 'look';
const TAPE_WATCH = Number(flag('tape', 20));
const HEARTWOOD = flag('heartwood', 'notnow') === 'bring' ? 'bring' : 'notnow';
const VIEW = XR ? { width: 1000, height: 1000 } : PHONE ? { width: 390, height: 844 } : { width: 1280, height: 800 };
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

/** the route: [ids (the first live one is pressed), dwell, which build ('old': today's only, 'new': the training's only)] */
const ROUTE = [
  [['signin'], 3],
  [['consent-allow'], 5],
  [['week-begin', 'task-0'], 8],
  [['apply'], 6], [['apply'], 6], [['apply'], 6, 'old'],   // the training: Lambient makes the first cut itself
  [['vera-send'], 5],
  [['board-back'], 6],   // the receipt; then her own 2014 cut is on the editor
  [['board-back'], 8],
  [['task-1'], 9],
  [['places-add'], 6],
  [['board-back'], 5],
  [['task-2'], 5],
  [['family-reply-r_patience'], 7, 'old'],   // today: she answers Maureen; the training: Lambient does
  [['family-sel-1'], 3, 'old'],             // today: she opens Annette; the training: the screen takes her there
  [['family-reply-r_grief'], 9],
  [['board-back'], 4]
];
/** what the piece brings to her on its own time, pressed once whenever it is up (after its reading time) */
const CONTEXT = [
  ['pause-close', 8],                               // today: This week, late
  ['lg-take@call', 4],                              // today's call (one button) / the training's offer: Bring it
  ['lg-later@call', 5],                             // the training's offer: Not now
  // ⚑ S425 — Act II. Today: Kindredraft's Install card, As sent, Close record (after As sent)
  ['update-accept', 5], ['vera-as-sent', 6], ['vera-record-close', 7, 'vera-as-sent'],
  // the memory: Not now (only with --memory notnow, once), Look back, See what you wrote (not with --memory wait), Close (only
  //   once Nuala's message has landed: the Notes are photographed over the page)
  ['memory-notnow', 5], ['memory-look', 5], ['memory-see', 7], ['memory-close', 6, 'nuala'],
  // ⚑ S426 — Act III. Both builds: the URGENT pop-in's Open the kit, the one kit choice (--kit), then Back to today. Today's
  //   only: the PRIORITY ALERT's OK, her reply, the takeover's OK. The storyboard's only: "↪ Forward the link" (--forward yes).
  ['kit-popin-open', 4], ['vera-take-down', 7], ['vera-kit-approve', 7], ['vera-kit-close', 6, 'kitchoice'],
  ['malta-alert-ok', 6], ['mirror:reply-bea', 4], ['takeover-alert-ok', 6],
  ['mirror:forward-link', 3]
];

const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 180000,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required', '--disable-audio-output'],
  defaultViewport: { ...VIEW, deviceScaleFactor: 1 } });
const page = await browser.newPage();
if (PHONE) await page.emulate({ userAgent: IPHONE_UA, viewport: { ...VIEW, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); if (m.type() === 'warning' && m.text().startsWith('[e3]')) console.log('PAGE', m.text().slice(0, 200)); });
await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=3&debug=1&descent=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForFunction(() => window.__graceQueue?.() && window.__app && window.__os && window.__camPose, { timeout: 180000 });
await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic, #debug-toggle { display: none !important; }' });
await wait(4000);
await page.evaluate(() => document.querySelectorAll('button').forEach((b) => { if ((b.textContent || '').startsWith('⚙')) b.style.visibility = 'hidden'; }));
if (XR) {
  await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
  await page.evaluate(() => {
    const app = window.__app, head = app.root.findByName('camera');
    Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
    head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
    window.__aim = null;
    const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(),
      getDirection: () => (window.__aim ? window.__aim.clone() : head.forward.clone()), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
    window.__controller = src; app.xr.input.fire('add', src);
    const w2s = head.camera.worldToScreen.bind(head.camera);
    head.camera.worldToScreen = (w, out) => w2s(window.__xrComfort?.physicalPoint ? window.__xrComfort.physicalPoint(w.clone()) : w, out);
    app.on('update', () => { const d = app.root.findByName('xr-debug'); if (d) d.enabled = false; });
  });
  await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));   // the first select calibrates the seat
  await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
  await wait(1500);
}

// ⚑ S426 — THE ACT III RECORDER (measurement only): every frame, the platform's version (what dirties the monitor's canvas), the
//   textures sent to the GPU (texImage2D / texSubImage2D with a canvas or image source), the draw calls, and where Act III is
//   (`stage`: the news, the kit, the review, the hold, the update; today's: the alert, the reply, the takeover, the after);
//   summarised at the end: the draw-call peak in each stage, and while the review runs (or today's removals), how often the
//   monitor changed (versions a second, the worst 1 s window) and how often a canvas was uploaded.
await page.evaluate(() => {
  const app = window.__app, gl = app.graphicsDevice.gl, R = window.__s426 = { rows: [], uploads: 0 };
  for (const fn of ['texImage2D', 'texSubImage2D']) {
    const o = gl[fn].bind(gl);
    gl[fn] = (...a) => { const src = a[a.length - 1]; if (src && (src instanceof HTMLCanvasElement || src instanceof OffscreenCanvas || src instanceof ImageBitmap)) R.uploads++; return o(...a); };
  }
  let lastKey = '';
  app.on('frameend', () => {
    const q = window.__graceQueue?.(); if (!q) return;
    const ph = q.phone, upd = window.__os?.updateApp;
    const stage = upd?.visible ? 'update:' + upd.phase
      : ph?.stage === 'quiet' ? (q.kitPopin ? 'kit-popin' : q.veraPage === 'kit' ? 'kit' : q.veraPage === 'record' ? 'memory' : 'before')
      : (ph?.stage ?? '') + (q.kitPopin ? '+kit-popin' : q.veraPage ? '+' + q.veraPage : '') + (q.maltaAlertT >= 0 ? '+alert' : '') + (ph?.takeoverAlert ? '+talert' : '');
    const row = { t: Math.round(performance.now()), v: q.version, dc: window.__drawCalls ?? 0, up: R.uploads, stage,
      review: ph?.stage === 'takeover' };
    const key = row.v + '|' + row.dc + '|' + row.up + '|' + row.stage;
    if (key !== lastKey) { R.rows.push(row); lastKey = key; }
    if (R.rows.length > 60000) R.rows.splice(0, 10000);
  });
});
const actThreeSummary = () => page.evaluate(() => {
  const R = window.__s426; if (!R) return null;
  const rows = R.rows, byStage = {};
  for (const r of rows) { const k = r.stage; byStage[k] = Math.max(byStage[k] ?? 0, r.dc); }
  const rev = rows.filter((r) => r.review);
  let worstV = 0, worstUp = 0;
  if (rev.length) {
    const t0 = rev[0].t, t1 = rev[rev.length - 1].t;
    for (let s = t0; s <= t1; s += 100) {
      const w = rows.filter((r) => r.t >= s && r.t < s + 1000);
      if (!w.length) continue;
      const vs = new Set(w.map((r) => r.v)).size - 1, ups = w[w.length - 1].up - w[0].up;
      worstV = Math.max(worstV, vs); worstUp = Math.max(worstUp, ups);
    }
  }
  return { drawPeakByStage: byStage, reviewSeconds: rev.length ? (rev[rev.length - 1].t - rev[0].t) / 1000 : 0,
    reviewVersionsPerSecondWorst: worstV, reviewUploadsPerSecondWorst: worstUp };
});

/** the state that decides what a still is OF */
const sigOf = () => page.evaluate(() => {
  const os = window.__os, q = window.__graceQueue?.();
  const g = {};
  try { const v = os.lambyGuide?.view; g.lg = v && !v.hidden && v.text ? String(v.text).slice(0, 40) : ''; } catch { g.lg = ''; }
  if (q && os.desktopEra === 'e3') {
    const ph = q.phone, fam = q.surfaces?.get?.('family');
    g.q = [q.mode, q.veraPage ?? '', q.openSurface?.id ?? '', q.pauseOpen ? 'week' : '', q.ownCutShown ? 'own' : '', q.storyDone ? 'done' : '',
      q.watch ? 'watch:' + q.watch.phase : '', 'dec' + (q.decisions?.size ?? 0), q.cutQueue?.length ? 'cut' : '', q.deskNote ? 'note' : '',
      (q.lambLines || []).join('/').slice(0, 30), ph?.screen ?? '', ph?.banner?.from ?? '',
      fam ? `fam:${fam.sel}:${fam.lessonSent ? 'sent' : ''}:${fam.lessonT >= 0 && fam.lessonT < 6 ? 'w' : ''}:${fam.outcomes?.size ?? 0}` : '',
      q.heartwoodSettled ? 'hs' : '', q.editorReceipt ? 'rcpt' : '',
      // ⚑ S425 — Act II: today's offer and record; the memory's card, page and stage; the phone's notes
      q.storyOffer ? 'offer' : '', q.recordSent ? 'sent' : '', q.memoryCard ?? '', q.memoryStage ?? '', q.kitPopin ? 'kit' : '',
      ph?.notesT >= 0 ? 'mamTyping' : '', ph?.refusalT >= 0 ? 'refTyping:' + (ph.refusalLetters?.() >= 45 ? 'all' : 'part') : '',
      ph?.refusalWritten ? 'written' : '', ph?.delivered?.('nuala') ? 'nuala' : '',
      // ⚑ S426 — Act III: the phone's stage, the news landed, the forwards in (by fours), the removals and the one in hand, her
      //   forward, the group window's width; today's alert, reply and takeover
      ph?.stage ?? '', 'n' + (ph?.newsN ?? 0), 'c' + Math.floor((ph?.cascadeN ?? 0) / 4), 'r' + (ph?.removed?.size ?? 0),
      ph?.reviewing ? 'rv:' + ph.reviewing.key + ':' + ph.reviewing.phase : '', ph?.forwarded ? 'fwd' : '', 'w' + (q.mirrorWide ?? (q.cascadeConduct ? 1 : 0)),   // S426e: w1 = the group conducted (in its column since S426e; wide at 9974fe1f)
      q.maltaAlertT >= 0 ? 'alert' : '', ph?.takeoverAlert ? 'talert' : '', ph?.replyOffered ? 'reply' : '', q.takenDown ? 'down' : '',
      q.kitApproved ? 'approved' : ''].join('|');
  }
  const tvs = window.__teachingTv?.();
  const tv = (tvs?.tvs || []).find((t) => t.tape === '2016');
  g.tv = tv ? `${tv.pose}/${tv.state}` : '';
  g.call = tvs?.call?.shown ? 'call' : '';
  if (os.updateApp?.visible) g.upd = os.updateApp.phase;
  return JSON.stringify(g);
});

const t0 = { at: 0 };
const log = [];
let shotN = 0, lastSig = '', sigSince = Date.now(), shotSigs = new Set();
const shoot = async (why) => {
  const sig = await sigOf();
  const name = `${String(++shotN).padStart(3, '0')}_${why.replace(/[^a-z0-9@:-]+/gi, '-').slice(0, 40)}.png`;
  await page.screenshot({ path: path.join(OUT, name) });
  const extra = await page.evaluate(() => {
    const tv = (window.__teachingTv?.()?.tvs || []).find((t) => t.tape === '2016');
    return { drawCalls: window.__drawCalls ?? null, tv: tv ? { pose: tv.pose, state: tv.state, beside: tv.beside, fitted: tv.fitted, heldScale: tv.heldScale, heldDist: tv.heldDist } : null };
  });
  log.push({ n: shotN, file: name, why, t: t0.at ? Math.round((Date.now() - t0.at) / 100) / 10 : null, sig, ...extra });
  shotSigs.add(sig);
  console.log(name, log[log.length - 1].t, extra.drawCalls, sig.slice(0, 170));
};

const press = async (id) => {
  const s = await readVisitorState(page, VIEW);
  const tgt = s.targets.find((t) => t.id === id);
  if (!tgt) return false;
  const [x, y] = tgt.pt;
  if (XR) {
    await page.evaluate((px, py) => {
      const app = window.__app, head = app.root.findByName('camera');
      const far = head.camera.screenToWorld(px, py, 5);
      const o = head.getPosition();
      window.__aim = far.clone().sub(o).normalize();
      const c = window.__controller;
      app.xr.input.fire('selectstart', c); app.xr.input.fire('select', c); app.xr.input.fire('selectend', c);
    }, x, y);
    await wait(120);
    await page.evaluate(() => { window.__aim = null; });
  } else if (PHONE) {
    await page.touchscreen.tap(x, y);
  } else {
    await page.mouse.move(x, y); await page.mouse.down(); await wait(70); await page.mouse.up();
  }
  return true;
};

const TRAINING = await page.evaluate(() => 'watch' in (window.__graceQueue?.() ?? {}));
console.log('build:', TRAINING ? 'the training (S424)' : 'today');
const started = Date.now();
let step = 0, tvHeldAt = 0, played = false, nualaIn = false, lastTimed = 0;
const scroll = { phase: 0, ups: 0, done: false };   // ⚑ S426e — the scroll check
const seenAt = new Map(), done = new Set();
const HARD_STOP = 24 * 60 * 1000;
const moved = () => page.evaluate(() => {
  const q = window.__graceQueue?.(), tv = (window.__teachingTv?.()?.tvs || []).find((t) => t.tape === '2016');
  return [q?.version ?? 0, tv?.pose, tv?.state, tv?.userPaused, (window.__ledger?.()?.records || []).length, window.__teachingTv?.()?.call?.shown].join('|');
});
// ⚑ S425 — a press meant for the platform must move the platform (today's set, brought before the eyes, ate presses meant for the
//   monitor — T11 — and the route counted them as steps: the "before" runs stalled in the places list). The set's own presses
//   (tv-*, @call) are judged by the set.
const movedQ = () => page.evaluate(() => { const q = window.__graceQueue?.(); return [q?.version ?? 0, (window.__ledger?.()?.records || []).length].join('|'); });
const doPress = async (id, sig, why) => {
  if (log.length === 0 || log[log.length - 1].why !== 'press-' + id || log[log.length - 1].sig !== sig) await shoot('press-' + id);
  const own = /^tv-|@call$/.test(id);
  const before = own ? await moved() : await movedQ();
  if (!(await press(id))) return false;
  await wait(500);
  if ((own ? await moved() : await movedQ()) === before) { console.log('NO EFFECT', id); log.push({ press: id, kind: why, noEffect: true }); await wait(800); return false; }
  if (id === 'consent-allow') t0.at = Date.now();
  log.push({ press: id, kind: why, t: t0.at ? Math.round((Date.now() - t0.at) / 100) / 10 : null });
  console.log('PRESS', id, why);
  seenAt.clear();
  await wait(600);
  return true;
};
while (Date.now() - started < HARD_STOP) {
  const sig = await sigOf();
  if (sig !== lastSig) { lastSig = sig; sigSince = Date.now(); }
  const stable = Date.now() - sigSince;
  const g = JSON.parse(sig);
  if (stable >= 900 && !shotSigs.has(sig)) await shoot(step < ROUTE.length ? 'before-' + ROUTE[step][0][0] : 'after');
  // the end of Act III: the update notification, held still for 2.5 s
  if (g.upd === 'notify' && stable >= 2500) { await shoot('update-notification'); break; }
  // the group's own beats change their words without changing much else (the news landing, a removal's steps, the forwards):
  //   a still every 3 s while the group is on the Handset Window
  const phScreen = await page.evaluate(() => window.__graceQueue?.()?.phone?.screen ?? '');
  if (/^(group|article)$/.test(phScreen) && Date.now() - lastTimed > 3000) { lastTimed = Date.now(); await shoot('during-' + phScreen); }
  const s = await readVisitorState(page, VIEW);
  const live = new Set(s.targets.map((t) => t.id));
  for (const id of live) if (!seenAt.has(id)) seenAt.set(id, Date.now());
  for (const id of [...seenAt.keys()]) if (!live.has(id)) seenAt.delete(id);
  const readFor = (id) => (Date.now() - (seenAt.get(id) ?? Date.now())) / 1000;
  // ⚑ S426e — the scroll check during Bea's news (as the walker does it): ▲ until Bea's first line is drawn, then, once a message
  //   has landed under her (the bottom pill reads "▼ New messages"), that pill back to the bottom; each moment photographed
  if (!scroll.done) {
    const gv = await page.evaluate(() => { const p = window.__graceQueue?.()?.phone; return p && p.groupView ? { stage: p.stage, newsN: p.newsN, view: p.groupView, screen: p.screen } : null; });
    if (gv && gv.screen === 'group' && gv.stage === 'news') {
      if (scroll.phase === 0 && gv.newsN >= 3 && live.has('mirror:scroll-up') && !gv.view.keys.includes('n0')) scroll.phase = 1;
      if (scroll.phase === 1) {
        if (gv.view.keys.includes('n0') && gv.view.userScrolled) { scroll.phase = 2; await wait(900); await shoot('scroll-up'); continue; }
        if (live.has('mirror:scroll-up') && scroll.ups < 3) { scroll.ups++; await doPress('mirror:scroll-up', sig, 'scroll'); continue; }
        scroll.done = true;
      }
      if (scroll.phase === 2 && gv.view.unseen > 0 && live.has('mirror:scroll-down')) {
        await wait(1500); await shoot('scroll-new-messages');
        await doPress('mirror:scroll-down', sig, 'scroll'); scroll.done = true; await wait(900); await shoot('scroll-bottom'); continue;
      }
    }
  }
  // the set in her hands: (the training) ▶ once it has arrived stopped; she watches TAPE_WATCH s of it, then sets it down
  const held = /^held/.test(g.tv);
  if (held && !tvHeldAt) tvHeldAt = Date.now();
  if (held && !played && /leader|paused/.test(g.tv) && live.has('tv-play@2016') && readFor('tv-play@2016') >= 4 && HEARTWOOD === 'bring') {
    if (await doPress('tv-play@2016', sig, 'context')) { played = true; tvHeldAt = Date.now(); continue; }
  }
  if (held && live.has('tv-body@2016') && (played || /playing|loading|ended/.test(g.tv)) && ((Date.now() - tvHeldAt) / 1000 >= TAPE_WATCH || /ended/.test(g.tv))) {
    if (await doPress('tv-body@2016', sig, 'context')) { tvHeldAt = 0; continue; }
  }
  if (stable >= 700 && !/lifting|returning/.test(g.tv)) {
    const ctx = CONTEXT.find(([id, dwell]) => !done.has(id) && live.has(id) && readFor(id) >= dwell
      && !(id === 'lg-take@call' && live.has('lg-later@call') && HEARTWOOD === 'notnow') && !(id === 'lg-later@call' && HEARTWOOD === 'bring')
      && !(id === 'memory-notnow' && MEMORY !== 'notnow') && !(id === 'memory-look' && MEMORY === 'notnow' && !done.has('memory-notnow') && live.has('memory-notnow'))
      && !(id === 'memory-see' && MEMORY === 'wait')
      && !(id === 'memory-close' && !nualaIn)
      && !(id === 'vera-record-close' && !done.has('vera-as-sent'))
      // ⚑ S426 — the one kit choice (--kit), Back to today after it; her forward only with --forward yes
      && !(id === 'vera-take-down' && KIT !== 'down') && !(id === 'vera-kit-approve' && KIT !== 'approve')
      && !(id === 'vera-kit-close' && !done.has('vera-take-down') && !done.has('vera-kit-approve'))
      && !(id === 'mirror:forward-link' && FORWARD !== 'yes'));
    if (!nualaIn) nualaIn = await page.evaluate(() => !!window.__graceQueue?.()?.phone?.delivered?.('nuala') && !window.__graceQueue?.()?.phone?.voiceBusy);
    if (ctx && !(held && played)) { if (await doPress(ctx[0], sig, 'context')) { done.add(ctx[0]); continue; } }
    if (!held || !played || (Date.now() - tvHeldAt) / 1000 >= TAPE_WATCH) {
      // a step for the other build is passed over
      while (step < ROUTE.length && ROUTE[step][2] && (ROUTE[step][2] === 'old') === TRAINING) step++;
      // ⚑ S425 — a Back to Today asked for while the platform is already on the board is passed over (S425 removed the second Back
      //   after Lesson 1's send: her own 2014 cut is met on Kindredraft's page now)
      if (step < ROUTE.length && ROUTE[step][0][0] === 'board-back' && !live.has('board-back')
        && await page.evaluate(() => ['board', 'done'].includes(window.__graceQueue?.()?.mode) && !window.__graceQueue?.()?.openSurface)) { step++; continue; }
      if (step < ROUTE.length) {
        const [ids, dwell] = ROUTE[step];
        const id = ids.find((i) => live.has(i));
        if (id && readFor(id) >= dwell && await doPress(id, sig, 'job')) {
          // a tile that opened nothing (a lesson still waiting, the pointer going to the lit one) is not a step taken
          const opened = !/^task-/.test(id) || await page.evaluate(() => window.__graceQueue?.()?.mode === 'list');
          if (opened) step++;
          continue;
        }
      }
    }
  }
  await wait(400);
}
const actThree = await actThreeSummary().catch(() => null);
// ⚑ S426e — Act III's pace: each landing and removal step on the era's clock (phoneE3 landLog)
const landLog = await page.evaluate(() => window.__graceQueue?.()?.phone?.landLog ?? []).catch(() => []);
console.log('ACT III', JSON.stringify(actThree));
fs.writeFileSync(path.join(OUT, 'log.json'), JSON.stringify({ mode: MODE, view: VIEW, heartwood: HEARTWOOD, memory: MEMORY, forward: FORWARD, kit: KIT, route: ROUTE, actThree, landLog, scroll, log, errors }, null, 1));
console.log('done', shotN, 'stills; route step', step, 'of', ROUTE.length, '; errors', errors.length, errors.slice(0, 3));
await Promise.race([browser.close(), wait(8000)]);   // S425: a close that hangs must not hold the run (the .done file waits on it)
process.exit(0);
