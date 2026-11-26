#!/usr/bin/env node
/**
 * ⚑ S428 (UiB job 38, E2; his 26 Nov: "The automatic is 2026 not 2016 … think of cadency of actions, ifttt - if this than that") —
 * 2016'S CHAIN, ROW BY ROW, ON PRESSES (the A2 table of docs/reinterp/UIB_JOB_38_2026-11-26.md).
 *
 *     node tools/s428-chain-probe.mjs --port 5801 --out out/s428/chain-after
 *     node tools/s428-chain-probe.mjs --port 5802 --out out/s428/chain-before     # 5185e4f1
 *
 * Real mouse presses on the build's own published targets (tools/harness/visitor-state.mjs). At every row that waits for her, TWO
 * MINUTES WITH NO PRESS are run through the app's own update loop (`__app.update(0.1)` × 1200 in one go: every per-frame clock in the
 * piece advances as in play; nothing is rendered meanwhile) and must move nothing and open nothing (the signature below: the platform's
 * page, job and cards, the phone's screen, stage, notification and messages, the chain's step, the update). Each press must move the
 * chain to the next row. Where the fiction's own time runs (Lambient's lesson, a cut, a message's reading time, her line typing, Bea's
 * news, the review's steps) the probe runs it, says so, and checks it finished and then waits. Also: the phone's clock reads the real
 * time of day; the day is Tuesday 6 December. PASS / FAIL per check, report.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { launch, ff, e3, press, targets, playTo } from './harness/e3-route.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', `out/s428/chain-${PORT}`));
fs.mkdirSync(OUT, { recursive: true });

const { browser, page, errors, view } = await launch(PORT, { height: 800 });
const report = { port: PORT, checks: [], rows: [], errors };
const check = (row, name, ok, extra = '') => { report.checks.push({ row, name, ok: !!ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  [${row}] ${name}${extra ? '  · ' + extra : ''}`); return !!ok; };
const log = (m) => console.log('  ' + m);
const live = async () => new Set((await targets(page, view)).map((t) => t.id));
const tryPress = async (...ids) => { const l = await live(); for (const id of ids) if (l.has(id)) { await press(page, view, id, log); await ff(page, 0.3); return id; } return null; };
const sigOf = (s) => JSON.stringify([s.mode, s.page, s.job, s.week, s.card, s.memoryStage, s.kitPopin, s.minimised, s.phone.screen, s.phone.stage, s.phone.notice,
  s.phone.delivered.join(','), s.phone.newsN, s.phone.removed, s.phone.cascadeN, s.phone.end, s.update, s.chain]);
/** a row's starting state: if the press before did not bring it (the build before job 38 runs its own chain), it is played to it
 *  (tools/harness/e3-route.mjs), so each row is still checked on its own */
const sync = async (row, what, goal) => {
  let st = await e3(page);
  if (goal(st)) return st;
  st = await playTo(page, view, goal, { limit: 150 });
  check(row, `(resync) the row's start had to be played to: ${what}`, false, goal(st) ? 'reached' : 'NOT reached');
  return st;
};
/** two minutes, no press: nothing moves, nothing opens */
const idle = async (row, what) => {
  const a = await e3(page); await ff(page, 120); const b = await e3(page);
  const ok = sigOf(a) === sigOf(b);
  check(row, `two minutes with no press: nothing moves or opens (${what})`, ok, ok ? `step ${b.chain ?? '-'}` : `${sigOf(a)}\n        → ${sigOf(b)}`);
  report.rows.push({ row, idle: ok, before: a, after: b });
  return b;
};

// ── A1: the clock and the day ──
{
  const c = await page.evaluate(async () => {
    const d = new Date(), p = window.__graceQueue().phone, dev = (await import('/data/strings/era3_devices.json')).default;
    return { phone: p.eveningClock, real: [d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'), (() => { const e = new Date(Date.now() - 60000); return e.getHours() + ':' + String(e.getMinutes()).padStart(2, '0'); })()], date: dev.phone.lockDate };
  });
  check('A1', 'the phone\'s clock reads the visitor\'s real time of day', c.real.includes(c.phone), `${c.phone} (real ${c.real[0]})`);
  check('A1', 'the day reads Tuesday 6 December', c.date === 'Tuesday 6 December', c.date);
}

// ── rows 1–2 ──
let s = await e3(page);
check('1', 'the sign-in waits', s.mode === 'signin');
s = await idle('1', 'Sign in');
await tryPress('signin'); s = await e3(page); check('1', 'Sign in → Lambient\'s question', s.mode === 'consent');
s = await idle('2', 'the question');
await tryPress('consent-allow'); s = await e3(page); check('2', 'Allow → the board and This week', (s.mode === 'board') && s.week);
s = await idle('2', 'This week');
await tryPress('week-begin'); s = await e3(page); check('3', 'Begin → Lesson 1', s.job === 'testimony');

// ── row 3: the lessons (Lambient's own cut, the cuts: the fiction's own time) ──
await ff(page, 30);
for (let i = 0; i < 4 && (await live()).has('apply'); i++) { await tryPress('apply'); await ff(page, 14); }
await tryPress('vera-send'); await ff(page, 2); await tryPress('board-back'); await ff(page, 12);
s = await e3(page);
check('3', 'Lesson 1 finished: Lesson 2 opens to her', s.lessons[1] === 'lit', s.lessons.join(','));
check('3', 'the Mentor\'s message arrives as a notification; the phone\'s screen does not open', s.phone.delivered.includes('mentor') && s.phone.screen === 'lock', s.phone.screen);
check('3', 'the Handset Window is not brought forward', !(await page.evaluate(() => window.__graceQueue().mirrorReading)));
s = await idle('3', 'the board after Lesson 1');
await tryPress('task-1'); await tryPress('places-add'); await ff(page, 1); await tryPress('board-back'); await ff(page, 12);
s = await e3(page);
check('3', 'Lesson 2 finished: Lesson 3 opens to her; Orla\'s message is a notification, the phone unopened', s.lessons[2] === 'lit' && s.phone.delivered.includes('arrival') && s.phone.screen === 'lock');
await tryPress('task-2'); await ff(page, 14);
await tryPress('family-reply-r_grief'); await ff(page, 1); await tryPress('board-back'); await ff(page, 12);
s = await e3(page);
check('3', 'Lesson 3 finished: Mam\'s message arrives as a notification; the phone unopened', s.phone.delivered.includes('decision') && s.phone.screen === 'lock', `${s.phone.delivered.join(',')} · ${s.phone.screen}`);
await page.screenshot({ path: path.join(OUT, '03_mam-notification.png') });

// ── row 4: the memory card waits for Mam's message opened ──
s = await idle('4', 'Mam\'s message unopened');
check('4', 'no memory card while Mam\'s message is unopened (no 12 s failsafe)', !s.card);
await tryPress('mirror:lock-card:Mam', 'mirror:evening-banner'); s = await e3(page);
check('4', 'the press opens Mam\'s message', s.phone.screen === 'evening');
await ff(page, 12); s = await e3(page);
check('4', 'Mam\'s message read (its reading time), on the board: the memory card', s.card === 'offer');

// ── row 5b: Not now; back once on her next return ──
if (await tryPress('memory-notnow')) {
  s = await idle('5b', 'after Not now');
  check('5b', 'the card does not come back on quiet seconds', !s.card);
  await tryPress('week-open'); await ff(page, 1); await tryPress('pause-close'); await ff(page, 0.5);
  s = await e3(page);
  check('5b', 'her return to the board brings it back once, Look back alone', s.card === 'again' && !(await live()).has('memory-notnow'));
} else check('5b', 'Not now is on the card', false);

// ── row 5: Look back → the page (it turns to her own words in its reading time) ──
await sync('5', 'the memory card', (x) => !!x.card);
await tryPress('memory-look'); s = await e3(page); check('5', 'Look back → the memory page', s.page === 'record');
await ff(page, 40);
s = await idle('5', 'the memory page open');
check('5', 'the Notes do not open by themselves while the page is open', s.phone.screen !== 'notes' && !s.phone.conducting);

// ── row 6: closing the page → a Notes notification ──
await sync('6', 'the memory page', (x) => x.page === 'record');
await tryPress('memory-close'); await ff(page, 0.5); s = await e3(page);
check('6', 'closing the page → a Notes notification on the phone', s.phone.notice === 'notes', `notice ${s.phone.notice}, screen ${s.phone.screen}`);
await page.screenshot({ path: path.join(OUT, '06_notes-notification.png') });
s = await idle('6', 'the Notes notification');
check('6', 'the Notes do not open by themselves', s.phone.screen !== 'notes');

// ── row 7: tapping it → her Notes, her line typing (its own time), then waiting ──
await tryPress('mirror:evening-banner', 'mirror:lock-notice'); s = await e3(page);
if (!(s.phone.screen === 'notes' && s.phone.conducting)) s = await sync('7', 'her Notes', (x) => x.phone.screen === 'notes' || x.phone.written);
check('7', 'tapping it opens the Notes and her line types', s.phone.screen === 'notes' && s.phone.conducting);
await ff(page, 15); s = await e3(page);
check('7', 'her line written (the fiction\'s own time), then nothing runs', s.phone.written && !s.phone.conducting);
s = await idle('7', 'the Notes open, written');
check('7', 'the Notes stay open until she closes them', s.phone.screen === 'notes');

// ── row 8: closing the Notes → the lock screen, Nuala's message there ──
await sync('8', 'her line written', (x) => x.phone.written);
await tryPress('mirror:back'); s = await e3(page);
check('8', 'closing the Notes locks the phone', s.phone.screen === 'lock');
await ff(page, 4); s = await e3(page);
check('8', 'Nuala\'s message arrives as a notification on the lock screen', s.phone.delivered.includes('nuala') && s.phone.screen === 'lock');
s = await idle('8', 'Nuala\'s message unopened');
check('8', 'no news before she opens Nuala\'s message', s.phone.stage === 'quiet');

// ── row 9: opening Nuala's message → the group's notification (Bea's first line), after her message's reading time ──
await sync('9', 'Nuala\'s message delivered', (x) => x.phone.delivered.includes('nuala'));
await tryPress('mirror:lock-card:Nuala'); s = await e3(page);
check('9', 'Nuala\'s message opens', s.phone.screen === 'evening');
await ff(page, 12); s = await e3(page);
check('9', 'a notification from Maiden-to-be, Bea\'s first line in it', s.phone.notice === 'bea' && s.phone.newsN === 1, `notice ${s.phone.notice}, ${s.phone.banner ?? ''}`);
await page.screenshot({ path: path.join(OUT, '09_bea-notification.png') });
s = await idle('9', 'the group\'s notification');
check('9', 'the group does not open by itself', s.phone.screen !== 'group');

// ── rows 10–11: opening it → the news (its own time) → read → the kit pops in, and waits ──
await sync('10', 'Bea\'s news begun', (x) => x.phone.stage !== 'quiet');
await tryPress('mirror:evening-banner', 'mirror:lock-notice'); s = await e3(page);
check('10', 'opening it opens the group', s.phone.screen === 'group');
await ff(page, 60); s = await e3(page);
check('10', 'Bea\'s news lands one message at a time, each after its reading time (the fiction\'s own time), and is read', s.phone.stage === 'read');
check('11', 'the last read: the kit pops in on the board, URGENT', s.kitPopin);
s = await idle('11', 'the kit\'s pop-in');
check('11', 'the kit never opens by itself', s.page !== 'kit');

// ── row 12: the kit; Approve; Back to today → the review's notification ──
await sync('12', 'the kit\'s pop-in', (x) => x.kitPopin || x.page === 'kit');
await tryPress('kit-popin-open'); s = await e3(page); check('12', 'opening the kit', s.page === 'kit');
s = await idle('12', 'the kit open');
await tryPress('vera-kit-approve'); await tryPress('vera-kit-close'); await ff(page, 0.5); s = await e3(page);
check('12', 'Back to today → a notification from the group: GracePlatform is reviewing it', s.phone.notice === 'review', `notice ${s.phone.notice}`);
await page.screenshot({ path: path.join(OUT, '12_review-notification.png') });
s = await idle('12', 'the review\'s notification');
check('12', 'the review does not start by itself', s.phone.stage === 'read');

// ── rows 13–14: opening the group → the review (its own time) → "Review could not keep up." ──
await sync('13', 'the kit closed', (x) => x.records.includes('e3-two-jobs') && x.page !== 'kit' && (x.phone.notice === 'review' || x.phone.stage !== 'read'));
await tryPress('mirror:evening-banner', 'mirror:lock-notice'); s = await e3(page);
check('13', 'opening the group starts the review there', s.phone.screen === 'group' && s.phone.stage === 'takeover');
await ff(page, 120); s = await e3(page);
check('14', 'the review ran in the platform\'s own time, the forwards outran it: "Review could not keep up."', s.phone.stage === 'after');
s = await idle('14', 'the end, in the group');
check('14', 'the end waits for her: no update', !s.update);

// ── row 15: closing the group → the update ──
await sync('15', '"Review could not keep up."', (x) => x.phone.stage === 'after');
await tryPress('mirror:back'); await ff(page, 3); s = await e3(page);
check('15', 'closing the group brings the update notice', s.update, `${s.updatePhase}`);
await page.screenshot({ path: path.join(OUT, '15_update.png') });

report.errors = errors;
check('-', 'console: no errors', errors.length === 0, errors.slice(0, 3).join(' | '));
report.pass = report.checks.every((c) => c.ok);
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
console.log(report.pass ? 'CHAIN PROBE: PASS' : `CHAIN PROBE: FAIL (${report.checks.filter((c) => !c.ok).length} of ${report.checks.length})`);
await browser.close();
process.exit(report.pass ? 0 : 1);
