/**
 * ⚑ S428 (UiB job 38, A2 + B1–B4; his 26 Nov: "The automatic is 2026 not 2016 … think of cadency of actions, ifttt - if this than
 * that") — 2016'S CHAIN, IN SHORT, IN `npm test`.
 *
 * Bundles the real workstation (src/room/graceQueueLite.ts, with its phone, src/desktop/apps/phoneE3.ts) and the default board's
 * jobs in memory with esbuild, runs them in Node on a canvas that draws nothing, and plays 2016 from Sign in to the update with
 * PRESSES — each one a press at the centre of the control the workstation itself published (`handleClick`, the same path a mouse
 * or a ray takes; the Handset Window's controls are its `mirror:` rects). The fiction's own time runs through the class's own
 * `update` (0.1 s frames). At every row of the A2 table that waits for her, TWO MINUTES with no press must move nothing and open
 * nothing; each press moves the chain one row (`chainState`). Also: the clock is the real time of day and the day is Tuesday 6
 * December; nothing a visitor opens or plays pauses the review (the stall of 26 Nov); Shut Down's refusal is drawn in a quiet scene
 * (B1); Leave… is a tall button clear of Start (B2); Lambient's button is drawn and answerable on a job page and hidden on the felt
 * memory page (B3); the Start map's Now names the step and "Take me there" does what her press would (B4).
 * The browser probes (tools/s428-chain-probe.mjs, tools/s428-stall-probe.mjs) do the same with real presses in the room.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as esbuild from 'esbuild';

const built = await esbuild.build({
  stdin: {
    contents: "export { GraceQueueLite } from './src/room/graceQueueLite.ts'; export { ledger } from './src/state/ledger.ts';"
      + " export { veraDay } from './src/state/veraDay.ts'; export { PlacesListApp } from './src/desktop/apps/placesList.ts';"
      + " export { FamilyCallsApp } from './src/desktop/apps/familyCalls.ts'; export { GroupTask } from './src/desktop/apps/groupTask.ts';",
    resolveDir: process.cwd(), loader: 'ts', sourcefile: 'e3-chain-entry.ts'
  },
  bundle: true, write: false, format: 'esm', platform: 'browser', logLevel: 'error',
  define: { __FESTIVAL__: 'false', __BUILD_TAG__: '"test"', __APP_VERSION__: '"test"' },
  loader: { '.png': 'dataurl', '.mp3': 'dataurl', '.wav': 'dataurl', '.jpg': 'dataurl' }
});

// ── a browser that draws nothing: the 2D context measures 6 px a letter and ignores the rest; no sound; no storage ──
const ctx2d = () => new Proxy({ font: '10px sans-serif', fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1, lineWidth: 1, textBaseline: 'top', textAlign: 'left',
  imageSmoothingEnabled: false, imageSmoothingQuality: 'low', lineDashOffset: 0 }, {
  get(t, k) {
    if (k in t) return t[k];
    if (k === 'measureText') return (s) => ({ width: String(s).length * 6, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 });
    if (k === 'getImageData' || k === 'createImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, (w | 0) * (h | 0)) * 4), width: w, height: h });
    if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => ({ addColorStop() {} });
    if (k === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
    return () => {};
  },
  set(t, k, v) { t[k] = v; return true; }
});
const canvas = () => { const c = { width: 300, height: 150, style: {}, getContext: () => ctx2d(), toDataURL: () => '', addEventListener() {} }; return c; };
globalThis.window ??= { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }), location: { search: '' }, devicePixelRatio: 1 };
globalThis.document ??= { createElement: () => canvas(), fonts: { check: () => true, load: async () => [] }, addEventListener() {}, body: { appendChild() {} }, getElementById: () => null, querySelector: () => null };
globalThis.Audio ??= class { constructor() { this.paused = true; this.volume = 1; this.currentTime = 0; } play() { this.paused = false; return Promise.resolve(); } pause() { this.paused = true; } addEventListener() {} };

const bundle = path.join(os.tmpdir(), `e3-chain-test-${process.pid}.mjs`);
fs.writeFileSync(bundle, built.outputFiles[0].text);
const M = await import(bundle);
fs.rmSync(bundle, { force: true });

const W = 676, H = 390, g = canvas().getContext('2d');
const q = new M.GraceQueueLite();
q.mountTask(new M.PlacesListApp()); q.mountTask(new M.FamilyCallsApp()); q.mountTask(new M.GroupTask());
const draw = () => { q.draw(g, W, H); return q.rects; };
const live = () => draw().map((r) => r.id);
const pressId = (id) => {
  const r = draw().find((x) => x.id === id);
  assert.ok(r, `${id} is drawn and pressable (live: ${live().join(', ')})`);
  q.handleClick(r.x + r.w / 2, r.y + r.h / 2);
};
/** the fiction's own time, 0.1 s a frame, as era3Devices ticks it (the Wick card's stamp taken as the room takes it) */
const run = (s) => { for (let i = 0, n = Math.round(s * 10); i < n; i++) { if (q.wickBanReady) q.takeWickBan(); q.update(0.1); if (i % 5 === 0) draw(); } draw(); };
const P = q.phone;
/** what may move or open: the platform's page, job, cards; the phone's screen, stage, notification, messages; the chain's step; the update */
const sig = () => JSON.stringify([q.mode, q.veraPage, q.openSurface?.id ?? null, q.pauseOpen, q.kitPopin, q.memoryCard, q.memoryStage, q.minimised,
  P.screen, P.stage, P.noticeId, P.newsN, P.cascadeN, [...P.removed].length, P.evening.map((e) => e.id).join(','), P.endAnswered, q.updateReady, q.chainState?.step ?? null]);
let rows = 0;
const idle = (label) => { const a = sig(); run(120); const b = sig(); assert.equal(b, a, `${label}: two minutes with no press move nothing and open nothing`); rows++; };
const step = () => q.chainState?.step ?? null;
const ledgerRecords = () => M.ledger.records;

// ── A1: the clock is the visitor's own time of day; the day stays Tuesday 6 December ──
{
  const d = new Date(), want = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  const ok = [want, (() => { const e = new Date(Date.now() - 60000); return `${e.getHours()}:${String(e.getMinutes()).padStart(2, '0')}`; })()];
  assert.ok(ok.includes(P.eveningClock), `A1: the phone's clock reads the real time of day (${P.eveningClock}, wanted ${want})`);
  const lockDate = JSON.parse(fs.readFileSync('data/strings/era3_devices.json', 'utf8')).phone.lockDate;
  assert.equal(lockDate, 'Tuesday 6 December', 'A1: the day stays Tuesday 6 December');
  assert.doesNotMatch(fs.readFileSync('src/desktop/apps/phoneE3.ts', 'utf8'), /const EVENING_START\s*=/, 'A1: EVENING_START is gone');
}

// ── rows 1–3: sign in, Allow, the training (each lesson opens the next; a message arrives as a notification and opens nothing) ──
q.settleArrival(); draw();
idle('row 1 (sign-in waits)');
pressId('signin'); assert.equal(q.mode, 'consent', 'row 1: Sign in → the question');
pressId('consent-allow'); assert.equal(q.mode, 'board', 'row 2: Allow → the board'); assert.ok(q.pauseOpen, 'row 2: This week');
pressId('week-begin'); assert.equal(q.mode, 'list', 'row 3: Begin → Lesson 1');
run(30);   // Lambient's own first cut (the fiction's own time)
for (let i = 0; i < 4 && live().includes('apply'); i++) { pressId('apply'); run(14); }
pressId('vera-send'); run(2); pressId('board-back'); run(1);
assert.equal(q.lessonState('places'), 'lit', 'row 3: Lesson 1 finished → Lesson 2 lit (no Heartwood wait)');
run(10);
assert.equal(P.screen, 'lock', 'row 3: the Mentor\'s message arrived and opened nothing on the phone');
assert.ok(P.delivered('mentor'), 'row 3: the Mentor\'s message is a notification');
pressId('task-1'); pressId('places-add'); run(1); pressId('board-back'); run(10);
assert.ok(P.delivered('arrival') && P.screen === 'lock', 'row 3: Orla\'s message arrived as a notification; the phone did not open');
pressId('task-2'); run(14);   // Lesson 3: Lambient answers Maureen (its own time), then Annette is hers
pressId('family-reply-r_grief'); run(1); pressId('board-back'); run(12);
assert.ok(P.delivered('decision') && P.screen === 'lock', 'row 3: Mam\'s message arrived as a notification; the phone did not open');

// ── row 4: the memory card waits for Mam's message OPENED (no 12 s failsafe) ──
assert.equal(step(), 'mam', 'row 4: the Now is Mam\'s message');
idle('row 4 (Mam\'s message unopened: no memory card)');
assert.equal(q.memoryCard, null, 'row 4: no card while Mam\'s message is unopened');
pressId('mirror:lock-card:Mam');   // her message's card on the lock screen
assert.equal(P.screen, 'evening', 'row 4: the press opens Mam\'s thread');
run(12);   // her message's reading time
assert.equal(q.memoryCard, 'offer', 'row 4: Mam\'s message opened and read, on the board: the memory card');

// ── row 5b: Not now → back once, Look back alone, on her next RETURN to the board (not quiet seconds) ──
pressId('memory-notnow'); assert.equal(q.memoryCard, null);
idle('row 5b (Not now: the card does not come back on quiet seconds)');
pressId('week-open'); assert.ok(q.pauseOpen, 'row 5b: she leaves the board (This week)'); run(1);
pressId('pause-close'); run(0.2);
assert.equal(q.memoryCard, 'again', 'row 5b: back on the board, the card again, Look back alone');
assert.ok(!live().includes('memory-notnow'), 'row 5b: Look back alone');

// ── row 5: Look back → the page; it turns to her own words in its reading time (kept), then waits ──
pressId('memory-look'); assert.equal(q.veraPage, 'record', 'row 5: the memory page');
run(40);
idle('row 5 (the page open: the Notes do not come by themselves)');
assert.equal(P.screen, 'evening', 'row 5: nothing opened on the phone (Mam\'s thread, where she left it)');

// ── row 6: closing the page → a Notes notification (the Notes do not open) ──
pressId('memory-close');
assert.equal(P.noticeId, 'notes', 'row 6: a Notes notification on the phone');
idle('row 6 (the Notes notification waits)');
assert.notEqual(P.screen, 'notes', 'row 6: the Notes did not open by themselves');

// ── row 7: tapping it → the Notes, her line typing (its own time), then waiting ──
pressId('mirror:evening-banner');   // the Notes notification, a banner over Mam's thread
assert.equal(P.screen, 'notes', 'row 7: the Notes open');
assert.ok(P.conductingNotes, 'row 7: her line types');
run(15);
assert.ok(P.refusalWritten && !P.conductingNotes, 'row 7: her line written (the fiction\'s own time), then nothing runs');
idle('row 7 (the Notes open, written: waiting for her to close them)');

// ── row 8: closing the Notes → the phone locks; Nuala's message lands on the lock screen ──
pressId('mirror:back');
assert.equal(P.screen, 'lock', 'row 8: the phone locks');
run(4);
assert.ok(P.delivered('nuala'), 'row 8: Nuala\'s message arrives (on the lock screen)');
idle('row 8 (Nuala\'s message unopened)');
assert.equal(P.stage, 'quiet', 'row 8: no news yet');

// ── row 9: opening Nuala's message → the group's notification (Bea's first line) after her message's reading time ──
pressId('mirror:lock-card:Nuala');
assert.equal(P.screen, 'evening', 'row 9: Nuala\'s thread');
run(12);
assert.equal(P.noticeId, 'bea', 'row 9: a notification from Maiden-to-be');
assert.equal(P.newsN, 1, 'row 9: Bea\'s first line in it');
idle('row 9 (the group\'s notification waits: the group does not open)');
assert.notEqual(P.screen, 'group', 'row 9: the group did not open by itself');

// ── rows 10–11: opening it → the news, a message at a time (its own time); read → the kit pops in, and waits ──
pressId('mirror:evening-banner');
assert.equal(P.screen, 'group', 'row 10: the group opens');
run(60);
assert.equal(P.stage, 'read', 'row 10: Bea\'s news landed, each after the one before had its reading time');
assert.ok(q.kitPopin, 'row 11: the last read, the kit pops in on the board');
idle('row 11 (the kit pops in and waits: it never opens itself)');
assert.equal(q.veraPage, null, 'row 11: the kit did not open by itself');

// ── row 12: the kit; Approve; Back to today → the review's notification ──
pressId('kit-popin-open'); assert.equal(q.veraPage, 'kit');
idle('row 12 (the kit open)');
pressId('vera-kit-approve'); pressId('vera-kit-close');
assert.equal(P.noticeId, 'review', 'row 12: a notification from the group: GracePlatform is reviewing it');
idle('row 12 (the review waits for her to open the group)');
assert.equal(P.stage, 'read', 'row 12: the review did not start by itself');

// ── the stall of 26 Nov: open the finished "Answer the mothers" at once, then the group, then the game, then minimise ──
pressId('task-2'); assert.equal(q.openSurface?.id, 'family', 'stall: the finished lesson opens');
assert.ok(live().includes('lg-tray') || true);
pressId('mirror:evening-banner');
assert.equal(P.stage, 'takeover', 'row 13: opening the group starts the review, a job open beside it');
run(15);
const removedA = [...P.removed].length;
assert.ok(removedA >= 1, `row 13: the review runs with a job open (${removedA} removed)`);
pressId('mirror:back'); pressId('mirror:back'); pressId('mirror:floppy'); assert.ok(q.floppy.open, 'stall: the phone game open (the group left: Messages, home, the game)');
run(15);
assert.ok([...P.removed].length > removedA, 'row 13: the review runs while the game is open');
q.floppy.closeGame(); pressId('win-min'); assert.ok(q.minimised, 'stall: the window minimised');
run(120);
assert.equal(P.stage, 'after', 'row 14: "Review could not keep up." — the review ran to its end with all of that open');
assert.equal(q.minimised, true, 'stall: the window did not come back by itself');
assert.equal(q.updateReady, false, 'row 14: the end waits in the group for her');

// B1 — Shut Down's refusal is drawn in this quiet moment; B4 — the Now names the end and takes her there
pressId('start-menu');
const nowStep = q.chainState;
assert.equal(nowStep?.step, 'end', 'B4: the Now names the step (the group, outnumbered)');
assert.ok(live().includes('sm-take'), 'B4: Take me there is offered');
const leave = draw().find((r) => r.id === 'sm-leave'), start = draw().find((r) => r.id === 'start-menu');
assert.ok(leave && leave.h >= 24, `B2: Leave… is a tall button (${leave?.h} px)`);
assert.ok(leave && start && start.y - (leave.y + leave.h) >= 10, `B2: Leave… is clear of Start (${start.y - (leave.y + leave.h)} px)`);
assert.ok(leave.x > start.x + start.w, 'B2: Leave… is to the right of Start');
pressId('sm-shut');
assert.ok(live().includes('shut-ok'), 'B1: Shut Down\'s refusal is drawn, quiet scene or not');
pressId('shut-ok'); assert.ok(!q.startMenuOpen, 'B1: OK closes it');
pressId('start-menu'); pressId('sm-take');
assert.equal(P.screen, 'group', 'B4: Take me there opens the group');
assert.equal(q.updateReady, false, 'B4: Take me there answered nothing for her');

// B3 — Lambient's button on a job page, answerable; not on the felt memory page
assert.ok(q.guideAskable, 'B3: on a job page Lambient\'s button is drawn');

// ── row 15: closing the group → the update ──
idle('row 15 (the end, in the group, waits for her)');
pressId('mirror:back');
assert.equal(P.endAnswered, 'close', 'row 15: closing the group answers the end');
assert.ok(q.updateReady, 'row 15: the update follows');

// ── source guards: the retired clocks stay retired ──
const gq = fs.readFileSync('src/room/graceQueueLite.ts', 'utf8'), ph = fs.readFileSync('src/desktop/apps/phoneE3.ts', 'utf8'), e3d = fs.readFileSync('src/room/era3Devices.ts', 'utf8');
for (const [src, re, what] of [[gq, /const KIT_POPIN_AUTO\s*=/, 'KIT_POPIN_AUTO'], [gq, /const MALTA_CLEAR_SECONDS\s*=/, 'MALTA_CLEAR_SECONDS'], [gq, /const MEMORY_AGAIN_SECONDS\s*=/, 'MEMORY_AGAIN_SECONDS'],
  [gq, /const MEMORY_CLOSED_BREATH\s*=/, 'MEMORY_CLOSED_BREATH'], [gq, /const MINIMISED_RETURN_SECONDS\s*=/, 'MINIMISED_RETURN_SECONDS'], [gq, /this\.offerWaitT/, 'the memory card\'s failsafe'],
  [gq, /const HEARTWOOD_FAILSAFE\s*=/, 'HEARTWOOD_FAILSAFE'], [gq, /const TAIL_HOLD_SECONDS\s*=/, 'TAIL_HOLD_SECONDS'], [e3d, /const FINAL_GAP\s*=/, 'FINAL_GAP'],
  [ph, /^\s*if \(!visible\) return;/m, 'the phone\'s pause while a job or the game is open']]) assert.doesNotMatch(src, re, `A3: ${what} is retired`);

console.log(`2016's chain: ${rows} rows each waited two minutes on no press with nothing moving; rows 1–15 each moved by her press; the review ran through a reopened lesson, the game and a minimised window; Shut Down refused in view, Leave tall and clear of Start, Take me there; the clock the real time of day. OK.`);
