#!/usr/bin/env node
/**
 * ⚑ S433 (UiB job 40, the welcome; his 26 Nov: "It should welcome right from the start to the turtoral of the system") — 2016's
 * OPENING, PHOTOGRAPHED FROM THE SEAT: from Sign in, through GracePlatform's welcome (when the build has one), to the end of the
 * training's three lessons, every new screen once it has held still.
 *
 *     node tools/s433-welcome-stills.mjs --port 5831 --mode desktop --out <dir>/before     # desktop | xr
 *
 * The same tool photographs the build before the welcome (5ae6508a: sign-in → Lambient's question → This week → the lessons) and
 * after it. It presses only what a visitor presses (tools/harness/e3-route.mjs: a real mouse press on the computer, the headset
 * mock's controller ray and trigger in xr), with the build's own published targets; where a press is not in a build (the welcome's
 * own) it is simply not there. The fiction's own times run through the app's own update loop (`ff`). Lamby's unasked offer after
 * Lesson 1 is answered Not now (the set never comes: these are the platform's screens). Stills are 2560 × 1440 (1280 × 720 at 2×).
 * Names: NN_<what>_<mode>.png. log_<mode>.json: each still, its state and draw calls; each press.
 */
import fs from 'node:fs';
import path from 'node:path';
import { launch, ff, e3, press, targets, wait } from './harness/e3-route.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const MODE = flag('mode', 'desktop') === 'xr' ? 'xr' : 'desktop';
const OUT = path.resolve(flag('out', `out/s433/stills-${MODE}`));
fs.mkdirSync(OUT, { recursive: true });

const { browser, page, errors, view } = await launch(PORT, { mode: MODE, scale: 2, width: 1280, height: 720 });
const log = { port: PORT, mode: MODE, stills: [], presses: [], errors };
const say = (m) => console.log(m);

/** what a still is OF: the platform's screen, the welcome's step, the lesson's moment, Lambient's balloon */
const sigOf = () => page.evaluate(() => {
  const q = window.__graceQueue?.(), os = window.__os;
  if (!q) return '{}';
  const fam = q.surfaces?.get?.('family');
  let lg = '';
  try { const v = os.lambyGuide?.view; lg = os.lambyGuide?.active && v && !v.hidden && v.text ? String(v.text).slice(0, 30) : ''; } catch { lg = ''; }
  return JSON.stringify({
    mode: q.mode, page: q.veraPage ?? '', job: q.openSurface?.id ?? (q.mode === 'list' ? 'testimony' : ''), week: !!q.pauseOpen,
    welcome: q.welcomeStep ?? null, watch: q.watch ? q.watch.phase : '', cut: !!q.cutQueue?.length, done: !!q.storyDone, rcpt: !!q.editorReceipt,
    dec: q.decisions?.size ?? 0, lessons: ['testimony', 'places', 'family'].map((id) => { try { return q.lessonState(id); } catch { return '?'; } }).join(','),
    fam: fam && q.openSurface === fam ? `${fam.sel}:${fam.lessonSent ? 's' : ''}:${fam.complete() ? 'c' : ''}` : '', lg,
    lane: (q.lambLines || []).join('/').slice(0, 30)
  });
});
const nameOf = (g) => {
  if (g.welcome !== null && g.welcome !== undefined && g.mode !== 'list') return `welcome-${g.welcome}`;
  if (g.mode === 'signin') return 'signin';
  if (g.mode === 'consent') return 'consent';
  if (g.week) return 'this-week';
  if (g.mode === 'list') {
    const lesson = { testimony: 'lesson1', places: 'lesson2', family: 'lesson3' }[g.job] ?? g.job;
    if (g.job === 'testimony') return `${lesson}-${g.watch ? 'watch-' + g.watch : g.cut ? 'cutting' : g.done ? (g.rcpt ? 'sent' : 'done') : 'turn-' + g.dec}`;
    if (g.job === 'family') return `${lesson}-${g.fam.includes('c') ? 'done' : g.fam.startsWith('1') ? 'annette' : 'maureen'}`;
    return `${lesson}-${g.lessons.split(',')[1] === 'done' ? 'done' : 'page'}`;
  }
  if (g.lg) return `board-lambient`;
  return `board-${g.lessons.replace(/,/g, '-')}`;
};
let shotN = 0;
const shotSigs = new Set();
const shoot = async (sig, tag = '') => {
  const g = JSON.parse(sig);
  await wait(800);   // real frames: the screens drawn and uploaded
  const file = `${String(++shotN).padStart(2, '0')}_${nameOf(g)}_${MODE}.png`;
  await page.screenshot({ path: path.join(OUT, file) });
  const draws = await page.evaluate(() => window.__drawCalls ?? null);
  log.stills.push({ file, state: g, draws });
  shotSigs.add(sig + tag);
  say(`still ${file} · draws ${draws}`);
};

const live = async () => new Set((await targets(page, view)).map((t) => t.id));
/** the press a visitor makes next (one), or null: then the fiction's own time runs */
const nextPress = async () => {
  const s = await e3(page), l = await live(), has = (id) => l.has(id);
  const first = (...ids) => ids.find(has) ?? null;
  // Lambient's unasked balloon (a tip, or the set's offer): Not now / OK
  if (s.guide?.balloon) { const id = first('lg-later', 'lg-ok', 'lg-x'); if (id) return id; }
  if (s.mode === 'signin') return first('signin');
  // the welcome's own presses (after the welcome is built), and Lambient's question inside it
  const w = first('welcome-next', 'welcome-begin', 'consent-allow');
  if (w) return w;
  if (s.week) return first('week-begin', 'pause-close');
  if (s.mode === 'list') {
    if (s.watch) return null;
    if (s.job === 'testimony') {
      if (await page.evaluate(() => !!window.__graceQueue().cutQueue?.length)) return null;   // a cut being made: she watches it
      return first('apply', 'vera-send', 'board-back');
    }
    if (s.job === 'places') return first('places-add', 'board-back');
    if (s.job === 'family') {
      const f = await page.evaluate(() => { const f = window.__graceQueue().surfaces.get('family'); return { sel: f.sel, moved: !!f.lessonMoved, done: f.complete() }; });
      if (f.done) return first('board-back');
      if (!f.moved) return null;
      if (f.sel !== 1) return first('family-sel-1');
      return first('family-reply-r_grief');
    }
    return first('board-back');
  }
  if (s.mode === 'board' || s.mode === 'done') {
    const lit = s.lessons.findIndex((x) => x === 'lit');
    if (lit >= 0) return first('task-' + lit);
  }
  return null;
};

const HARD = 900;   // fiction seconds
let fiction = 0, lastSig = '', stableFor = 0, extrasDone = false;
/** ⚑ on the welcome's board card (after build): Lambient's button asked, and the Start map's Now, each photographed, then put away */
const extras = async () => {
  const shotAs = async (what) => { await wait(800); const file = `${String(++shotN).padStart(2, '0')}_${what}_${MODE}.png`; await page.screenshot({ path: path.join(OUT, file) }); log.stills.push({ file, state: what }); say(`still ${file}`); };
  if ((await live()).has('lg-tray')) {
    await press(page, view, 'lg-tray', say); await ff(page, 1.5); await shotAs('welcome-board-lambient-asked');
    for (const id of ['lg-ok', 'lg-x']) if ((await live()).has(id)) { await press(page, view, id, say); break; }
    await ff(page, 0.5);
  }
  if ((await live()).has('start-menu')) {
    await press(page, view, 'start-menu', say); await ff(page, 0.5); await shotAs('welcome-board-start-now');
    await press(page, view, 'start-menu', say); await ff(page, 0.5);
  }
};
while (fiction < HARD) {
  const sig = await sigOf();
  if (sig !== lastSig) { lastSig = sig; stableFor = 0; }
  if (stableFor >= 1 && !shotSigs.has(sig)) await shoot(sig);
  if (!extrasDone && stableFor >= 1 && JSON.parse(sig).welcome === 'board' && shotSigs.has(sig)) { extrasDone = true; await extras(); lastSig = ''; continue; }
  const s = await e3(page);
  if (s.lessons.every((x) => x === 'done') && (s.mode === 'board' || s.mode === 'done') && !s.job && stableFor >= 3) { await shoot(sig, '#end'); break; }
  if (stableFor >= 2) {
    const id = await nextPress();
    if (id) {
      await press(page, view, id, say);
      log.presses.push({ id, at: Math.round(fiction * 10) / 10 });
      stableFor = 0; lastSig = '';
      await ff(page, 0.3); fiction += 0.3;
      continue;
    }
  }
  await ff(page, 0.5); fiction += 0.5; stableFor += 0.5;
}
fs.writeFileSync(path.join(OUT, `log_${MODE}.json`), JSON.stringify(log, null, 1));
say(`done: ${log.stills.length} stills · ${log.presses.length} presses · errors ${errors.length}`);
await browser.close();
