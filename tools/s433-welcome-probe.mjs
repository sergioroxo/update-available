#!/usr/bin/env node
/**
 * ⚑ S433 (UiB job 40, proof 2) — FROM SIGN IN, EACH STEP OF GRACEPLATFORM'S WELCOME WAITS FOR HER PRESS, NONE FIRES BY ITSELF, AND THE
 * LESSONS READ AS THE TRAINING'S STEPS. In the room, with real presses (tools/harness/e3-route.mjs: a mouse press on the computer, the
 * headset mock's controller ray and trigger in xr), the fiction's own time run through the app's own update loop.
 *
 *     node tools/s433-welcome-probe.mjs --port 5831 --mode desktop --out <dir>      # desktop | xr
 *
 *  1. Sign in, and every step of the welcome (hello, board, lesson, Lambient's question, Lambient's button, the phone, the record),
 *     and This week: TWO MINUTES with no press (120 s of the app's own clock) move nothing and open nothing — the welcome's step, the
 *     platform's page, This week, the phone's screen and its notifications, the record, Lambient's balloon and its unasked count;
 *     then her press moves exactly one step.
 *  2. Every frame of it, and each lesson's page at each of its moments, is checked as drawn (the workstation's own draw, its text
 *     lines recorded): no line past the page's right or bottom edge, no line over another line, the welcome page's five chips each
 *     holding its label, the welcome's card and This week under the tiles (never over one), every press of the page inside it.
 *  3. The lessons: each page's head says TRAINING · STEP n OF 4, what the step teaches, and NOW with the one thing to do (read from
 *     the drawn lines), at every moment of the lesson (Lambient showing, her turn, done).
 *  4. Lambient's unasked balloons in 2016 up to the end of the training (the era's count, ≤ 8), and none during the welcome.
 * Writes probe_<mode>.json; prints PASS/FAIL lines.
 */
import fs from 'node:fs';
import path from 'node:path';
import { launch, ff, e3, press, targets } from './harness/e3-route.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const MODE = flag('mode', 'desktop') === 'xr' ? 'xr' : 'desktop';
const OUT = path.resolve(flag('out', 'out/s433/probe'));
fs.mkdirSync(OUT, { recursive: true });

const { browser, page, errors, view } = await launch(PORT, { mode: MODE, scale: 1, width: 1280, height: 720 });
const results = [];
const check = (ok, what, detail = '') => { results.push({ ok: !!ok, what, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${what}${detail ? ' — ' + detail : ''}`); };

/** what may move or open (never the redraw version: a clock may repaint, it may not move the story) */
const sig = () => page.evaluate(() => {
  const q = window.__graceQueue(), p = q.phone, os = window.__os, L = window.__ledger?.() ?? {};
  return JSON.stringify({
    welcome: q.welcomeStep, mode: q.mode, page: q.veraPage ?? null, job: q.openSurface?.id ?? null, week: !!q.pauseOpen, card: q.memoryCard ?? null,
    phone: p.screen, notice: p.noticeId ?? null, evening: (p.evening || []).map((e) => e.id).join(','), queued: p.queued,
    balloon: !!os.lambyGuide?.active, said: os.lambyGuide?.counts?.e3 ?? null, records: (L.records || []).length, lamby: (L.lamby || []).length,
    graceQueue: (L.graceQueue || []).length, saver: !!q.saver, minimised: !!q.minimised
  });
});
const said = () => page.evaluate(() => window.__os.lambyGuide?.counts?.e3 ?? null);

/** the workstation's own draw onto a spare canvas, its text lines recorded (graceQueueLite lends its fillText to the page's draw) */
const drawn = () => page.evaluate(() => {
  const q = window.__graceQueue();
  const cv = document.createElement('canvas'); cv.width = 676; cv.height = 390;
  const g = cv.getContext('2d'); const lines = []; const real = g.fillText.bind(g);
  g.fillText = (t, x, y, mw) => {
    const size = Number(/(\d+(?:\.\d+)?)px/.exec(g.font)?.[1] ?? 11), w = g.measureText(String(t)).width;
    const top = g.textBaseline === 'top' ? y : g.textBaseline === 'middle' ? y - size * 0.6 : y - size;
    const x0 = g.textAlign === 'center' ? x - w / 2 : g.textAlign === 'right' || g.textAlign === 'end' ? x - w : x;
    if (String(t).trim()) lines.push({ t: String(t), x0, x1: x0 + w, y0: top, y1: top + size * 1.1, size });
    return mw === undefined ? real(t, x, y) : real(t, x, y, mw);
  };
  q.draw(g, 676, 390);
  const covers = (q.covers || []).map((c) => ({ id: c.id, x: c.x, y: c.y, w: c.w, h: c.h }));
  return { lines, rects: q.rects.map((r) => ({ id: r.id, x: r.x, y: r.y, w: r.w, h: r.h })), content: q.guideContent, covers, welcome: q.welcomeStep, week: !!q.pauseOpen, mode: q.mode };
});

/** the layout checks on one frame */
const layout = async (label) => {
  const d = await drawn();
  const c = d.content; if (!c) { check(false, `${label}: the page drew`); return d; }
  const right = c.x + c.w, bottom = c.y + c.h;
  // the platform's own lines (not the title bar, the taskbar or the Handset Window)
  const own = d.lines.filter((l) => l.x0 < 472 && l.y0 >= c.y - 3 && l.y1 <= 362);
  const past = own.filter((l) => l.x1 > right + 1.5 || l.y1 > bottom + 2.5);
  check(past.length === 0, `${label}: no line past the page's edge`, past.slice(0, 3).map((l) => `"${l.t.slice(0, 30)}" ${Math.round(l.x1)},${Math.round(l.y1)}`).join(' | '));
  const over = [];
  for (let i = 0; i < own.length; i++) for (let j = i + 1; j < own.length; j++) {
    const a = own[i], b = own[j];
    if (a.t === b.t && Math.abs(a.x0 - b.x0) < 1 && Math.abs(a.y0 - b.y0) < 1) continue;   // the same line drawn twice in place
    const ix = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), iy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
    if (ix > 2 && iy > Math.min(a.size, b.size) * 0.35) over.push(`"${a.t.slice(0, 24)}" × "${b.t.slice(0, 24)}"`);
  }
  check(over.length === 0, `${label}: no line over another`, over.slice(0, 3).join(' | '));
  const presses = d.rects.filter((r) => /^(welcome-next|week-begin|pause-close|consent-allow|consent-decline|board-back|apply|skip|vera-send|places-add|places-refuse|family-refuse|family-reply-)/.test(r.id));
  const out = presses.filter((r) => r.y + r.h > bottom + 0.5 || r.x + r.w > right + 0.5 || r.y < c.y - 3);
  check(out.length === 0, `${label}: every press of the page inside it`, out.map((r) => `${r.id} ${Math.round(r.y + r.h)}`).join(' | '));
  // the welcome's card and This week: under the tiles, never over one
  const card = d.rects.find((r) => r.id === 'welcome-next' || r.id === 'week-begin' || r.id === 'pause-close');
  const tiles = (await page.evaluate(() => window.__graceQueue().tasks().length)) && d.mode === 'board'
    ? d.lines.filter((l) => /^Step [234] ·/.test(l.t)) : [];
  if (card && tiles.length && (d.welcome && d.welcome !== 'hello' || d.week)) {
    const cardTop = card.y - 30;   // the card's top is above its button; the tiles' labels must end above the card's frame
    const cv = d.covers.find((x) => x.id === 'cover:this-week');
    const top = cv ? cv.y : Math.min(...own.filter((l) => /^WELCOME ·/.test(l.t)).map((l) => l.y0 - 11), cardTop);
    const low = Math.max(...tiles.map((l) => l.y1));
    check(low < top, `${label}: the card lies under the tiles`, `tile labels end ${Math.round(low)}, card from ${Math.round(top)}`);
  }
  // the welcome page's five chips each hold their label
  if (d.welcome === 'hello') {
    const CW = Math.min(480, c.w - 48), cx = c.x + Math.round((c.w - CW) / 2), chipW = Math.floor((CW - 20) / 5);
    const parts = ['Your', 'board', 'A', 'lesson', 'Lambient', 'phone', 'record'];
    const labs = own.filter((l) => parts.includes(l.t));
    const bad = labs.filter((l) => { const i = Math.floor((l.x0 - cx) / (chipW + 5)); return l.x1 > cx + i * (chipW + 5) + chipW - 1; });
    check(labs.length >= 7 && bad.length === 0, `${label}: the five chips each hold their label`, bad.map((l) => l.t).join(', '));
  }
  return d;
};

/** ⚑ Lambient's button asked over a card of the welcome's (or This week): one voice at a time — the card waits (its press not drawn),
 *  the balloon lies over no tile and no card, and Got it brings the card back */
const askedBalloon = async (label) => {
  if (!(await liveIds()).has('lg-tray')) { check(true, `${label}: (no Lambient button in this mock)`); return; }
  await pressOne('lg-tray'); await ff(page, 1.5);
  const d = await drawn();
  const lg = d.rects.find((r) => r.id === 'lg-cover');
  const cardPress = d.rects.find((r) => ['welcome-next', 'week-begin', 'pause-close'].includes(r.id));
  const tiles = d.lines.filter((l) => /^Step [234] ·|^Start here$|^after step/.test(l.t));
  const hitsTile = lg ? tiles.filter((l) => l.x1 > lg.x && l.x0 < lg.x + lg.w && l.y1 > lg.y && l.y0 < lg.y + lg.h) : [];
  check(!!lg && !cardPress && hitsTile.length === 0, `${label}: Lambient asked — its balloon up, the card waits, no tile under the balloon`,
    `${lg ? `balloon ${lg.x},${lg.y} ${lg.w}×${lg.h}` : 'no balloon'} · card press ${cardPress?.id ?? 'none'} · tile lines under it ${hitsTile.length}`);
  for (const id of ['lg-ok', 'lg-x']) if ((await liveIds()).has(id)) { await pressOne(id); break; }
  await ff(page, 0.5);
  const back = (await drawn()).rects.some((r) => ['welcome-next', 'week-begin', 'pause-close'].includes(r.id));
  check(back, `${label}: the balloon closed, the card is back`);
};

/** two minutes of the app's own clock with no press: nothing moves, nothing opens */
const idle = async (label) => {
  const a = await sig();
  await ff(page, 120);
  const b = await sig();
  check(a === b, `${label}: two minutes with no press move nothing and open nothing`, a === b ? '' : `${a} → ${b}`);
};

const liveIds = async () => new Set((await targets(page, view)).map((t) => t.id));
const pressOne = async (id) => { const ok = await press(page, view, id); await ff(page, 0.4); return ok; };

// ── Sign in ──
const s0 = await e3(page);
check(s0.mode === 'signin', 'the arrival waits at Sign in', s0.mode);
// (at Sign in a stall may bring Lambient's just-in-time tip: G2's own clock, counted in the eight; it moves nothing)
const storyOnly = (j) => { const o = JSON.parse(j); delete o.balloon; delete o.said; return JSON.stringify(o); };
{ const a = storyOnly(await sig()); await ff(page, 120); const b = storyOnly(await sig());
  check(a === b, 'Sign in: two minutes with no press move nothing and open nothing (the story)', a === b ? '' : `${a} → ${b}`); }
for (const id of ['lg-ok', 'lg-later', 'lg-x']) if ((await liveIds()).has(id)) { await pressOne(id); break; }
await pressOne('signin');
const said0 = await said();
const STEPS = ['hello', 'board', 'lesson', 'consent', 'lambient', 'phone', 'record'];
const trail = [];
for (let i = 0; i < STEPS.length; i++) {
  const st = STEPS[i];
  const s = await e3(page);
  check(s.welcome === st, `welcome step ${i + 1}: ${st}`, `on ${s.welcome}`);
  await layout(`welcome ${st}`);
  const pressId = st === 'consent' ? 'consent-allow' : 'welcome-next';
  check((await liveIds()).has(pressId), `welcome ${st}: its press (${pressId}) is published to the visitor's aim`);
  await idle(`welcome ${st}`);
  check(!(await page.evaluate(() => window.__os.lambyGuide?.active)), `welcome ${st}: no Lambient balloon unasked`);
  if (st === 'board') await askedBalloon('welcome board');
  await pressOne(pressId);
  const after = await e3(page);
  trail.push(`${st} →(${pressId}) ${after.welcome ?? (after.week ? 'This week' : after.mode)}`);
  check((after.welcome ?? null) === (STEPS[i + 1] ?? null), `welcome ${st}: her press moves exactly one step`, trail[trail.length - 1]);
}
const sW = await e3(page);
check(sW.week && sW.mode === 'board', 'the welcome ends on This week', JSON.stringify({ week: sW.week, mode: sW.mode }));
await layout('This week (the welcome\'s last card)');
await idle('This week');
await askedBalloon('This week');
check((await said()) === said0, 'no unasked Lambient balloon from the press of Sign in to This week', `${said0} → ${await said()}`);

// ── the lessons: each page's head, at each of its moments ──
const heads = {};
const readHead = async (label) => {
  const d = await layout(label);
  const kick = d.lines.find((l) => /^TRAINING · STEP \d OF 4/.test(l.t))?.t ?? null;
  const tag = d.lines.find((l) => l.t === 'NOW');
  const now = tag ? d.lines.filter((l) => l.x0 > tag.x1 && Math.abs(l.y0 - tag.y0) < 14 && l.size >= 12).map((l) => l.t).join(' ') : null;
  const teach = kick ? d.lines.find((l) => Math.abs(l.y0 - d.lines.find((x) => x.t === kick).y0) < 4 && l.t !== kick)?.t ?? null : null;
  heads[label] = { kicker: kick, teaches: teach, now };
  check(!!kick && !!now && !!teach, `${label}: the head says the step, what it teaches, and NOW`, `${kick} · ${teach} · NOW ${now}`);
  return heads[label];
};
await pressOne('week-begin');
let h = await readHead('step 2 (Lambient shows the first rule)');
check(/STEP 2 OF 4/.test(h.kicker ?? '') && /^Nothing to press/.test(h.now ?? ''), 'step 2 opens on "nothing to press" while Lambient shows the rule');
for (let i = 0; i < 40 && (await e3(page)).watch; i++) await ff(page, 1);
await ff(page, 1);
h = await readHead('step 2 (her turn)');
check(/Apply or skip/.test(h.now ?? ''), 'step 2: her turn says Apply or skip');
for (let n = 0; n < 6; n++) {
  const l = await liveIds();
  if (l.has('apply')) { await pressOne('apply'); for (let k = 0; k < 20 && (await page.evaluate(() => window.__graceQueue().cutQueue.length)); k++) await ff(page, 1); continue; }
  break;
}
h = await readHead('step 2 (the send)');
check(/Send Renata/.test(h.now ?? ''), 'step 2: the send');
await pressOne('vera-send');
h = await readHead('step 2 (done)');
check(/Back to Today, for step 3/.test(h.now ?? ''), 'step 2 done: Back to Today, for step 3');
await pressOne('board-back'); await ff(page, 12);
// Lamby's set offer, if it comes: Not now (the probe is about the platform)
for (let k = 0; k < 3; k++) { const l = await liveIds(); if (l.has('lg-later')) { await pressOne('lg-later'); break; } await ff(page, 2); }
await layout('the board, step 3 lit');
await pressOne('task-1');
h = await readHead('step 3 (her turn)');
check(/STEP 3 OF 4/.test(h.kicker ?? '') && /Add The Wick/.test(h.now ?? ''), 'step 3: Add The Wick, or leave it off, as the NOW line');
await pressOne('places-add');
h = await readHead('step 3 (done)');
check(/for step 4/.test(h.now ?? ''), 'step 3 done: Back to Today, for step 4');
await pressOne('board-back'); await ff(page, 12);
await pressOne('task-2');
h = await readHead('step 4 (Lambient answers Maureen)');
check(/STEP 4 OF 4/.test(h.kicker ?? '') && /^Nothing to press/.test(h.now ?? ''), 'step 4 opens on "nothing to press" while Lambient answers Maureen');
for (let k = 0; k < 30 && !(await page.evaluate(() => window.__graceQueue().surfaces.get('family').lessonSent)); k++) await ff(page, 0.5);
await ff(page, 1);
h = await readHead('step 4 (Annette, her turn)');
check(/Answer Annette/.test(h.now ?? ''), 'step 4: Answer Annette, or don\'t send a script');
await pressOne('family-reply-r_grief');
h = await readHead('step 4 (done)');
check(/training is done/.test(h.now ?? ''), 'step 4 done: Back to Today, your training is done');
await pressOne('board-back'); await ff(page, 3);
const dEnd = await layout('the board, training done');
check(dEnd.lines.some((l) => l.t === 'TRAINING · DONE') && dEnd.lines.some((l) => /^Training done · 4 of 4/.test(l.t)), 'the board: TRAINING · DONE, "Training done · 4 of 4"');
const saidEnd = await said();
check(saidEnd !== null && saidEnd <= 8, 'Lambient\'s unasked balloons in 2016 to the end of the training: within the era\'s 8', `${saidEnd} said (${said0} before the welcome, at the Sign in stall the probe made)`);
const draws = await page.evaluate(() => window.__drawCalls ?? null);
const out = { port: PORT, mode: MODE, results, trail, heads, saidAtSignIn: said0, saidAtTrainingEnd: saidEnd, drawCalls: draws, errors };
fs.writeFileSync(path.join(OUT, `probe_${MODE}.json`), JSON.stringify(out, null, 1));
const fails = results.filter((r) => !r.ok).length;
console.log(`S433 welcome probe (${MODE}): ${results.length - fails} PASS, ${fails} FAIL · page errors ${errors.length} · draw calls ${draws}`);
await browser.close();
process.exit(fails ? 1 : 0);
