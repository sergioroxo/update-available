#!/usr/bin/env node
/**
 * ⚑ S428 (UiB job 38, E1; HEADSET_RUN_2026-11-26 answer a, his "It felt stuck") — THE STALL OF 26 NOV, PLAYED.
 *
 *     node tools/s428-stall-probe.mjs --port 5801 --out out/s428/stall-after
 *     node tools/s428-stall-probe.mjs --port 5802 --out out/s428/stall-before     # 5185e4f1: it must fail there
 *
 * 2016 played by presses from Sign in to the kit's URGENT pop-in (tools/harness/e3-route.mjs: real mouse presses on the build's own
 * published targets; the fiction's own times run faster through the app's own update loop, `__app.update(0.1)` in a row). Then, as
 * he did: the kit → Back to today → the finished "Answer the mothers" opened AT ONCE → (two minutes, no press) → Lambient's button
 * on that job page, Shut Down, Leave… → open the group from the phone's notification → the review runs → the phone game opened
 * during it → the window minimised → (two minutes) → back to the group → the end is there → close the group → the update.
 * Every check is printed PASS / FAIL and written to report.json. Real presses throughout; no debug jump.
 */
import fs from 'node:fs';
import path from 'node:path';
import { launch, ff, e3, press, targets, playTo, wait } from './harness/e3-route.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', `out/s428/stall-${PORT}`));
fs.mkdirSync(OUT, { recursive: true });

const { browser, page, errors, view } = await launch(PORT, { height: 800 });
const report = { port: PORT, checks: [], presses: [], states: [], errors };
const log = (m) => { report.presses.push(m); console.log(m); };
const check = (name, ok, extra = '') => { report.checks.push({ name, ok: !!ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  · ' + extra : ''}`); return !!ok; };
const live = async () => new Set((await targets(page, view)).map((t) => t.id));
const P = (id) => press(page, view, id, log);
const tryPress = async (...ids) => { const l = await live(); for (const id of ids) if (l.has(id)) { await P(id); return id; } return null; };
const shot = (name) => page.screenshot({ path: path.join(OUT, name + '.png') });
/** the group, opened as a visitor opens it: its notification if one is up, else from Messages (back to the list, then the group) */
const openGroup = async () => {
  for (let i = 0; i < 5; i++) {
    const s = await e3(page);
    const id = await tryPress('mirror:evening-banner', 'mirror:lock-notice'); if (id) return id;
    if (s.phone.screen === 'group') return i ? 'Messages' : 'already open';
    if (await tryPress('mirror:group')) continue;
    if (await tryPress('mirror:inbox')) continue;
    if (await tryPress('mirror:back', 'mirror:unlock')) continue;
  }
  return null;
};
const st = async (label) => { const s = await e3(page); report.states.push({ label, s }); return s; };

// ── 2016 to the kit ──
const atKit = await playTo(page, view, (s) => s?.kitPopin, { log });
check('2016 played by presses to the kit\'s URGENT pop-in', atKit?.kitPopin);

// ── the kit → Back to today → "Answer the mothers", finished, opened at once ──
await P('kit-popin-open'); await ff(page, 0.5);
check('the kit opens on her press', (await e3(page)).page === 'kit');
await P('vera-kit-close'); await ff(page, 0.2);
const back = await st('back to today');
check('Back to today: the board', back.mode === 'board' || back.mode === 'done');
const opened = await tryPress('task-2');
await ff(page, 0.3);
const job = await st('the finished lesson open');
check('the finished "Answer the mothers" opens at once', opened && job.job === 'family', `${job.job}`);
check('the group\'s notification is there (from the group: GracePlatform is reviewing it)', job.phone.notice === 'review', `notice ${job.phone.notice}`);
await shot('01_job-open_notice');

// two minutes, no press: nothing opens by itself
const before2 = JSON.stringify([job.phone.screen, job.phone.stage, job.page, job.job, job.update]);
await ff(page, 120);
const after2 = await st('two minutes, no press');
check('two minutes with no press: nothing opens by itself', JSON.stringify([after2.phone.screen, after2.phone.stage, after2.page, after2.job, after2.update]) === before2,
  `${before2} → ${JSON.stringify([after2.phone.screen, after2.phone.stage, after2.page, after2.job, after2.update])}`);

// ── B3: Lambient's button on this job page answers ──
const trayLive = (await live()).has('lg-tray');
check('B3: Lambient\'s taskbar button is drawn on the job page', trayLive);
if (trayLive) {
  await P('lg-tray'); await ff(page, 0.3);
  const g = await e3(page);
  check('B3: a press on it is answered (one short line)', g.guide.text && g.guide.balloon, `"${g.guide.text}"`);
  await shot('02_lambient-on-job-page');
  await tryPress('lg-ok'); await ff(page, 0.2);
}
// ── B1: Shut Down's refusal, B2: Leave… opens the leave dialog ──
const shutCheck = async (when) => {
  if (!(await tryPress('start-menu'))) return check(`B1 (${when}): the Start button`, false);
  await ff(page, 0.2);
  await shot(`03_start-menu_${when}`);
  const hasShut = await tryPress('sm-shut'); await ff(page, 0.2);
  const refused = (await live()).has('shut-ok');
  check(`B1 (${when}): Shut Down… shows its refusal`, hasShut && refused);
  if (refused) { await shot(`04_shut-refused_${when}`); await tryPress('shut-ok'); await ff(page, 0.2); }
};
await shutCheck('job-open');
if (await tryPress('start-menu')) {
  await ff(page, 0.2);
  report.leaveHit = await page.evaluate(() => { const r = window.__graceQueue().rects; const f = (id) => r.find((x) => x.id === id); const l = f('sm-leave'), s = f('start-menu');
    return l && s ? { leave: { x: l.x, y: l.y, w: l.w, h: l.h }, start: { x: s.x, y: s.y, w: s.w, h: s.h }, gapAboveStart: Math.round(s.y - (l.y + l.h)) } : null; });
  console.log('Leave… hit', JSON.stringify(report.leaveHit));
  await tryPress('sm-leave'); await wait(400);
  const dlg = await page.evaluate(() => { const m = document.getElementById('reinterp-game-menu'); return !!m && getComputedStyle(m).display !== 'none' && /plain page outside the story/.test(m.textContent || ''); });
  check('B2: Leave… opens the leave dialog', dlg);
  if (dlg) { await shot('05_leave-dialog'); await page.evaluate(() => { const b = [...document.querySelectorAll('#reinterp-game-menu button')].find((x) => /^\s*Stay\s*$/.test(x.textContent || '')); b?.click(); }); await wait(400); }
}

// ── open the group from the phone (its notification; or the group from Messages) ──
const how = await openGroup();
await ff(page, 10);
const rv = await st('the group opened, ten seconds');
check('the group opens on her press', rv.phone.screen === 'group', `by ${how}`);
check('the review runs beside the open job', rv.phone.stage === 'takeover' && rv.job === 'family', `stage ${rv.phone.stage}, job ${rv.job}, removed ${rv.phone.removed}`);
await ff(page, 8);
const rv2 = await st('the review, eighteen seconds');
check('the review moves (a message outlined, removed, folded)', rv2.phone.removed > 0 || rv2.phone.stage === 'after', `removed ${rv2.phone.removed}`);
await shot('06_review-beside-job');
await shutCheck('review-running');

// ── the phone game during it ──
await tryPress('mirror:back'); await ff(page, 0.2); await tryPress('mirror:back'); await ff(page, 0.2);
const game = await tryPress('mirror:floppy');
await ff(page, 0.5);
const g1 = await st('the game open');
check('the phone game opens during the review', game && g1.floppy);
const r0 = g1.phone.removed + g1.phone.cascadeN;
await ff(page, 15);
const g2 = await st('the game, fifteen seconds');
check('the review goes on while the game is open', g2.phone.removed + g2.phone.cascadeN > r0, `${r0} → ${g2.phone.removed + g2.phone.cascadeN}`);
await shot('07_game-during-review');
// the game's own way out (its back), then the window minimised
await tryPress('mirror:back'); await ff(page, 0.3);
if ((await e3(page)).floppy) await page.evaluate(() => window.__graceQueue().floppy.closeGame());
await tryPress('win-min'); await ff(page, 0.3);
const mn = await st('minimised');
check('the window minimised', mn.minimised);
await ff(page, 120);
const mn2 = await st('minimised, two minutes');
check('minimised: the review runs to its end ("Review could not keep up.")', mn2.phone.stage === 'after', `stage ${mn2.phone.stage}`);
check('minimised: the window does not come back by itself', mn2.minimised);
check('the end waits for her: no update yet', !mn2.update);
await shot('08_minimised');

// ── back to the group: the end is there; closing it brings the update ──
await openGroup(); await ff(page, 1);
const end = await st('the group again');
check('back in the group: "Review could not keep up." is there', end.phone.screen === 'group' && end.phone.stage === 'after');
await shot('09_end-in-group');
await tryPress('mirror:back'); await ff(page, 3);
const upd = await st('the group closed');
check('closing the group brings the update', upd.update, `update ${upd.update} (${upd.updatePhase})`);
await shot('10_update');

report.errors = errors;
check('console: no errors', errors.length === 0, errors.slice(0, 3).join(' | '));
report.pass = report.checks.every((c) => c.ok);
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
console.log(report.pass ? 'STALL PROBE: PASS' : `STALL PROBE: FAIL (${report.checks.filter((c) => !c.ok).length} of ${report.checks.length})`);
await browser.close();
process.exit(report.pass ? 0 : 1);
