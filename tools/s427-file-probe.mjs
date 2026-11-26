#!/usr/bin/env node
/**
 * ⚑ S427 (UiB job 37, T95; his 26 Nov to the sheet: "yes i agree. Yes I think the refusals should be marked too") — VERA'S FILE,
 * PLAYED TWO WAYS. 2016's jobs each under their own card, her refusals under the job refused and flagged, and the witness pulse
 * counting only what the file lists.
 *
 *     node tools/s427-file-probe.mjs --port 5701 --way do      --out <dir>   # way 1: she does every job
 *     node tools/s427-file-probe.mjs --port 5701 --way refuse  --out <dir>   # way 2: she refuses
 *
 * `?era=3` (the room settled, 2016 not begun). Daniel's 1997 and 2003 are poured into the page's own ledger first (a real walk's,
 * 1d9b6f60 VR door: his entries, the tags beside them), with 2003 reached: MOMENT 1, "before 2016". Then 2016 is PLAYED with the
 * build's own targets (tools/harness/visitor-state.mjs), a real mouse press each, from Sign in to the update notification, as
 * tools/s426-act3-stills.mjs plays it (its route, copied, with the two ways):
 *   - way 1 (`do`): Lesson 1 applied and sent, Lesson 2 The Wick added, Lesson 3 Annette answered, the group's check-in posted
 *     (behind "The other jobs", Start menu), the kit approved;
 *   - way 2 (`refuse`): a rule of Renata's skipped first (refusal 1: Lambient asks again; then she applies it), The Wick refused
 *     (refusal 2; then she adds it), Annette's script refused (refusal 3: Lambient sends it), the group's check-in refused (refusal
 *     4: an administrator posts it), Take my story down.
 * MOMENT 2, "mid-2016": the first second after Lesson 2 is on the map (`e3-job:places`). The video ("Tag the video") is on no
 * board of the visit, so it is driven through its own surface (recommendTask press / onLeave) once the update notification is
 * up: way 1 two tags and the preview; way 2 one tag, then left. Then her file is photographed WHERE THE VISITOR SEES IT
 * (the account chip pressed: "My account · activity" on the monitor, from the seat) and in the game menu's Your file (2016's
 * cards), the Close is asked for (`__enterClose`): MOMENT 3, "at the Close"; the machine's page, Receipt pressed, printed,
 * its 2016 block photographed. The viewport is 1280 × 720 at 2× (stills 2560 × 1440).
 *
 * At each moment: `pulse.count()` (the app's own witness pulse, src/witness/pulse.ts) against `recordEntries().length`, and the
 * ledger's lists added whole (the old count). Checks, written to report.json and printed PASS / FAIL:
 *   - the pulse equals the file at the three moments;
 *   - way 1: her five job entries under four cards (The testimony ×2, The places list, The daily check-in, The recommendation),
 *     the outcome words sent · added · posted · approved · tagged, none flagged;
 *   - way 2: four refusals, each under the card of the job refused (list → The correction queue, places → The places list, a mother
 *     → Moderation, group → The daily check-in), `refused`, flagged, and first on the Close's 2016 panel; the take-down under The
 *     testimony; the video `declined`, flagged; the flagged count in 2016's file and the receipt's 2016 line agree.
 * A review route, not a reachability proof (tools/walk.mjs is that).
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { readVisitorState } from './harness/visitor-state.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const WAY = flag('way', 'do') === 'refuse' ? 'refuse' : 'do';
const OUT = path.resolve(flag('out', `out/s427/${WAY}`));
const VIEW = { width: 1280, height: 720 };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

/** Daniel's 1997 and 2003, as the 1d9b6f60 VR walk filed them (its final ledger, the 2016 and 2026 lists left out) */
const PRE_2016 = {"records": ["profile-initialized", "kit-inserted", "rootcause-installed", "kit-read", "tape-played", "prayer-cut", "pledge-signed", "went-online", "search-1997", "channel-joined", "channel-reply:first message — spoke in channel, receptive", "dm-request:private message accepted — trusted contact opened", "yes-received", "mirc-log", "escalation-reply:disclosed distress — receptive, log it", "escalation-reply:seeking detail — minimize", "escalation-reply:hesitant — reassure", "rob-spoke-mother", "escalation-reply:boundary probe — affirm trust", "escalation-reply:resistant — proceed; consent already on file", "enrollment-acknowledged", "diary-committed", "deletion-failed", "diary-glitch", "forum-recommended", "testimony-prep", "testimony-release", "testimony-tapes", "testimony-cut", "testimony-online", "subject-migrated"], "tags": ["profile:icon:moon", "profile:chip:music", "profile:chip:diary", "profile:chip:friend", "profile:goal:fit_in", "pastoral-referral", "consent-on-file", "intake:father_bond:close", "intake:drill_posture:partial", "provotype:origin_intake_e1", "send:s1:visited"], "sends": [{"id": "s1", "outcome": "visited", "witness": "cross-reference: companion module viewed — files linked"}], "guidance": [{"id": "floppy", "outcome": "followed", "witness": "guidance: disk — followed"}, {"id": "kit", "outcome": "followed", "witness": "guidance: Un-Walk — followed"}, {"id": "pledge", "outcome": "followed", "witness": "guidance: pledge — answered"}, {"id": "channel", "outcome": "followed", "witness": "guidance: channel — followed"}, {"id": "search", "outcome": "followed", "witness": "guidance: search — followed"}, {"id": "form", "outcome": "followed", "witness": "guidance: family form — followed"}, {"id": "packet", "outcome": "followed", "witness": "guidance: packet — followed"}, {"id": "diary", "outcome": "followed", "witness": "guidance: journal — followed"}], "provotypes": [{"id": "origin_intake_e1", "outcome": "completed", "witness": "compliance: exemplary · outcome: further support recommended", "reps": 0}], "lamby": [{"id": "return-press", "outcome": "returned", "witness": "return: pressed — the reboot completed"}, {"id": "introduction", "outcome": "begun", "witness": "assistant: introduced — companion process accepted"}, {"id": "first-greeting", "outcome": "begun", "witness": "assistant: begun — first greeting"}, {"id": "guide:tvcall", "outcome": "begun", "witness": "guide requested: tvcall"}], "checkins": [{"id": "steady", "witness": "check-in: steady"}, {"id": "reminder", "witness": "evening reminder: unanswered — opened a private message instead"}], "caleb": [{"id": "opened", "outcome": "intervened", "witness": "contact: inbound — unlisted correspondent (caleb)"}, {"id": "its-me", "outcome": "replied", "witness": "contact: answered — subject identified himself"}, {"id": "never-saw", "outcome": "replied", "witness": "contact: subject reported the requests were never received"}, {"id": "every-word", "outcome": "replied", "witness": "recall: pledge retained — full recitation reported"}, {"id": "saturday", "outcome": "replied", "witness": "contact: date proposed — saturday"}, {"id": "want-you-too", "outcome": "committed", "witness": "conduct: subject stated intent — HOMOSEXUAL CONDUCT"}, {"id": "flag", "outcome": "intervened", "witness": "intervention: flagged — HOMOSEXUAL CONDUCT"}, {"id": "redaction", "outcome": "intervened", "witness": "intervention: successful — content blocked until further evaluation"}, {"id": "streak", "outcome": "intervened", "witness": "purity streak: reset 412 → 0"}, {"id": "alert", "outcome": "dismissed", "witness": "assistant: dismissed — accountability alert"}, {"id": "restore", "outcome": "restored", "witness": "block lifted — no evaluator assigned"}, {"id": "residue", "outcome": "residue", "witness": "— entry could not be classified —"}], "updates": [{"toEra": 2, "remindLaterCount": 0, "eulaScrollPct": 100}, {"toEra": 3, "remindLaterCount": 0, "eulaScrollPct": 100}]};

/** the route: [ids (the first live one is pressed), dwell, which build ('old': before the training only, 'new': the training only)] */
const ROUTE = [
  [['signin'], 3],
  [['consent-allow'], 5],
  [['week-begin', 'task-0'], 8],
  ...(WAY === 'refuse' ? [[['skip'], 6]] : []),   // refusal 1: a rule of Renata's (Lambient asks again; the rule stays open)
  [['apply'], 6], [['apply'], 6], [['apply'], 6, 'old'],
  [['vera-send'], 5],
  [['board-back'], 6],
  [['board-back'], 8],
  [['task-1'], 9],
  ...(WAY === 'refuse' ? [[['places-refuse'], 6]] : []),   // refusal 2: The Wick (a reprimand; the job stays open)
  [['places-add'], 6],
  [['board-back'], 5],
  [['task-2'], 5],
  [['family-reply-r_patience'], 7, 'old'],
  [['family-sel-1'], 3, 'old'],
  [[WAY === 'refuse' ? 'family-refuse' : 'family-reply-r_grief'], 9],   // refusal 3: Annette's script (Lambient sends it)
  [['board-back'], 4],
  // the group, behind "The other jobs" (the Start menu): its tile is appended to the board
  [['start-menu'], 3], [['sm-extra:jobs'], 3], [['start-menu'], 2], [['task-3'], 4],   // the menu stays open after the press: Start closes it
  [[WAY === 'refuse' ? 'group-refuse' : 'group-post'], 6],   // refusal 4: the check-in (an administrator posts it)
  [['board-back'], 4]
];
/** what the piece brings to her on its own time, pressed once whenever it is up (after its reading time), as S426's */
const CONTEXT = [
  ['pause-close', 8], ['lg-later@call', 5],
  ['update-accept', 5], ['vera-as-sent', 6], ['vera-record-close', 7, 'vera-as-sent'],
  ['memory-look', 5], ['memory-see', 7], ['memory-close', 6, 'nuala'],
  ['kit-popin-open', 4], [WAY === 'refuse' ? 'vera-take-down' : 'vera-kit-approve', 7], ['vera-kit-close', 6, 'kitchoice'],
  ['malta-alert-ok', 6], ['mirror:reply-bea', 4], ['takeover-alert-ok', 6]
];

const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 180000, protocolTimeout: 600000,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required', '--disable-audio-output'],
  defaultViewport: { ...VIEW, deviceScaleFactor: 2 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=3&debug=1&descent=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForFunction(() => window.__graceQueue?.() && window.__app && window.__os && window.__camPose, { timeout: 180000 });
await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic, #debug-toggle { display: none !important; }' });
await wait(4000);
await page.evaluate(() => document.querySelectorAll('button').forEach((b) => { if ((b.textContent || '').startsWith('⚙')) b.style.visibility = 'hidden'; }));

const report = { way: WAY, port: PORT, moments: {}, checks: [], presses: [], errors };
const check = (name, ok, extra = '') => { report.checks.push({ name, ok: !!ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };
const shot = async (name) => { await page.screenshot({ path: path.join(OUT, `${name}.png`) }); console.log('still', name); };

/** the file, the pulse and the ledger's lists, read through the app's own modules */
const READ = async () => {
  const L = (await import('/src/state/ledger.ts')).ledger;
  const R = await import('/src/witness/record.ts');
  const P = (await import('/src/witness/pulse.ts')).pulse;
  const entries = R.recordEntries();
  const lists = ['records', 'provotypes', 'sends', 'guidance', 'tapes', 'belongings', 'lamby', 'checkins', 'media', 'caleb', 'era3Arrival', 'graceQueue', 'comments', 'e4Space', 'updates', 'tags', 'games', 'era3Jobs'];
  const jobIds = new Set(['pipeline', 'places', 'group', 'kit', 'take-down', 'recommend', 'refusal']);
  const e3 = entries.filter((e) => e.era === 'e3');
  return {
    pulse: P.count(), file: entries.length,
    perEra: Object.fromEntries(['e1', 'e2', 'e3', 'e4'].map((e) => [e, entries.filter((x) => x.era === e).length])),
    ledgerLists: lists.reduce((n, k) => n + L[k].length, 0) + Number(L.guidePersonalisation.personalised),
    marks: L.records.filter((r) => r.startsWith('e3-')).length, tags: L.tags.length,
    jobs: e3.filter((e) => jobIds.has(e.id)).map((e) => ({ id: e.id, kind: e.kind, card: R.practiceOf(e.kind)?.title ?? e.kind, outcome: e.outcome, flagged: e.flagged, witness: e.witness })),
    e3: e3.map((e) => ({ id: e.id, kind: e.kind, outcome: e.outcome, flagged: e.flagged, witness: e.witness })),
    e3Flagged: e3.filter((e) => e.flagged).length,
    closePanel: [...e3.filter((e) => e.flagged), ...e3.filter((e) => !e.flagged)].slice(0, 3).map((e) => ({ id: e.id, flagged: e.flagged, witness: e.witness }))
  };
};
const read = () => page.evaluate(`(${READ})()`);
const moment = async (name) => {
  await wait(600);   // a few frames: the pulse is ticked by the engine once a frame
  const m = await read();
  report.moments[name] = m;
  console.log(`MOMENT ${name}: pulse ${m.pulse} · file ${m.file} (${JSON.stringify(m.perEra)}) · ledger lists ${m.ledgerLists} (marks ${m.marks}, tags ${m.tags})`);
  return m;
};

// ── MOMENT 1: before 2016 — Daniel's years poured in, 2003 reached ──
await page.evaluate(async (pre) => {
  const L = (await import('/src/state/ledger.ts')).ledger;
  for (const [k, v] of Object.entries(pre)) L[k].push(...JSON.parse(JSON.stringify(v)));
  if (!L.reachedEras.includes('e2')) L.reachedEras.push('e2');
}, PRE_2016);
await moment('before 2016');

const press = async (id) => {
  const s = await readVisitorState(page, VIEW);
  const tgt = s.targets.find((t) => t.id === id);
  if (!tgt) return false;
  const [x, y] = tgt.pt;
  await page.mouse.move(x, y); await page.mouse.down(); await wait(70); await page.mouse.up();
  return true;
};
const sigOf = () => page.evaluate(() => {
  const os = window.__os, q = window.__graceQueue?.(), ph = q?.phone, fam = q?.surfaces?.get?.('family');
  return JSON.stringify([q?.mode, q?.veraPage ?? '', q?.openSurface?.id ?? '', q?.pauseOpen ? 'week' : '', q?.watch ? 'watch:' + q.watch.phase : '',
    'dec' + (q?.decisions?.size ?? 0), q?.deskNote ? 'note' : '', ph?.screen ?? '', ph?.stage ?? '', fam ? `fam:${fam.sel}:${fam.outcomes?.size ?? 0}` : '',
    q?.memoryCard ?? '', q?.memoryStage ?? '', q?.kitPopin ? 'kit' : '', q?.takenDown ? 'down' : '', q?.kitApproved ? 'approved' : '',
    os.updateApp?.visible ? 'upd:' + os.updateApp.phase : '', window.__ledger?.()?.era3Jobs?.length ?? 0]);
});
const movedQ = () => page.evaluate(() => { const q = window.__graceQueue?.(); return [q?.version ?? 0, (window.__ledger?.()?.records || []).length, window.__ledger?.()?.era3Jobs?.length ?? 0].join('|'); });
const doPress = async (id, why) => {
  const before = await movedQ();
  if (!(await press(id))) return false;
  await wait(500);
  if ((await movedQ()) === before) { console.log('NO EFFECT', id); report.presses.push({ id, why, noEffect: true }); await wait(800); return false; }
  report.presses.push({ id, why });
  console.log('PRESS', id, why);
  seenAt.clear();
  await wait(600);
  return true;
};

const TRAINING = await page.evaluate(() => 'watch' in (window.__graceQueue?.() ?? {}));
const started = Date.now();
let step = 0, lastSig = '', sigSince = Date.now(), nualaIn = false, mid = false;
const seenAt = new Map(), done = new Set();
const HARD_STOP = 22 * 60 * 1000;
while (Date.now() - started < HARD_STOP) {
  const sig = await sigOf();
  if (sig !== lastSig) { lastSig = sig; sigSince = Date.now(); }
  const stable = Date.now() - sigSince;
  const g = JSON.parse(sig);
  if (!mid && await page.evaluate(() => (window.__ledger?.()?.records || []).includes('e3-job:places'))) { mid = true; await wait(1000); await moment('mid-2016'); }
  if (g[15] === 'upd:notify' && stable >= 2500) break;
  const s = await readVisitorState(page, VIEW);
  const live = new Set(s.targets.map((t) => t.id));
  for (const id of live) if (!seenAt.has(id)) seenAt.set(id, Date.now());
  for (const id of [...seenAt.keys()]) if (!live.has(id)) seenAt.delete(id);
  const readFor = (id) => (Date.now() - (seenAt.get(id) ?? Date.now())) / 1000;
  if (stable >= 700) {
    const ctx = CONTEXT.find(([id, dwell]) => !done.has(id) && live.has(id) && readFor(id) >= dwell
      && !(id === 'memory-close' && !nualaIn)
      && !(id === 'vera-record-close' && !done.has('vera-as-sent'))
      && !(id === 'vera-kit-close' && !done.has('vera-take-down') && !done.has('vera-kit-approve')));
    if (!nualaIn) nualaIn = await page.evaluate(() => !!window.__graceQueue?.()?.phone?.delivered?.('nuala') && !window.__graceQueue?.()?.phone?.voiceBusy);
    if (ctx) { if (await doPress(ctx[0], 'context')) { done.add(ctx[0]); continue; } }
    while (step < ROUTE.length && ROUTE[step][2] && (ROUTE[step][2] === 'old') === TRAINING) step++;
    if (step < ROUTE.length && ROUTE[step][0][0] === 'board-back' && !live.has('board-back')
      && await page.evaluate(() => ['board', 'done'].includes(window.__graceQueue?.()?.mode) && !window.__graceQueue?.()?.openSurface)) { step++; continue; }
    if (step < ROUTE.length) {
      const [ids, dwell] = ROUTE[step];
      const id = ids.find((i) => live.has(i));
      if (id && readFor(id) >= dwell && await doPress(id, 'job')) {
        const opened = !/^task-/.test(id) || await page.evaluate(() => window.__graceQueue?.()?.mode === 'list');
        if (opened) step++;
        continue;
      }
    }
  }
  await wait(400);
}
report.route = { step, of: ROUTE.length, seconds: Math.round((Date.now() - started) / 1000), training: TRAINING };
console.log('route step', step, 'of', ROUTE.length, 'in', report.route.seconds, 's');
await shot(`00_update-notification_${WAY}`);

// the update's notice sits over the platform and takes the press: "Remind me later" (it works once) clears it for the file
report.remindLater = await doPress('remind-later', 'file');
await wait(1500);
// ── the video: on no board of the visit, so through its own surface ──
report.video = await page.evaluate((way) => {
  const t = window.__graceQueue().surfaces.get('recommend');
  if (!t) return 'no surface';
  if (way === 'do') { t.press('tag:ssa'); t.press('tag:christiangay'); t.press('preview'); return 'tagged (two tags, preview)'; }
  t.press('tag:ssa'); t.onLeave(); return 'one tag, then left';
}, WAY);
await wait(800);

// ── her file where she sees it: the account chip, "My account · activity" on the monitor ──
const chip = await doPress('account-activity', 'file');
await wait(1500);
report.fileOpen = { pressed: chip, surface: await page.evaluate(() => window.__graceQueue?.()?.openSurface?.id ?? null) };
await shot(`01_vera-file_seat_${WAY}`);
// and the platform's own canvas at its own size, the same frame (for reading)
//   (the workstation's 676 × 390, drawn by the platform's own draw at 3×, as the monitor's texture is: tools/s405-file-probe.mjs)
fs.writeFileSync(path.join(OUT, `01b_vera-file_screen_${WAY}.png`), Buffer.from((await page.evaluate(() => {
  const q = window.__graceQueue(); const c = document.createElement('canvas'); c.width = 676 * 3; c.height = 390 * 3;
  const g = c.getContext('2d'); g.scale(3, 3); q.draw(g, 676, 390); return c.toDataURL();
})).split(',')[1] ?? '', 'base64'));
const end2016 = await moment('end of 2016');

// ── the game menu's Your file: her cards ──
await page.evaluate(async () => { const { gameMenuBus } = await import('/src/state/gameMenuBus.ts'); gameMenuBus.open(); });
await wait(900);
const opened = await page.evaluate(() => {
  const el = [...document.querySelectorAll('div, button, a')].find((e) => e.children.length === 0 && /^Your file — what the systems recorded/.test(e.textContent?.trim() ?? ''));
  if (!el) return false; el.click(); return true;
});
await wait(1000);
const found = await page.evaluate(() => {
  const h = [...document.querySelectorAll('div')].find((e) => e.textContent?.trim() === '2016 · Vera');
  if (!h) return false; h.scrollIntoView({ block: 'start' }); return true;
});
await wait(500);
await shot(`02_menu-your-file-2016_${WAY}`);
// …then one window further down (its top line brought down whole), then the end of the file (its last buttons whole)
const menuPane = `(() => { const h = [...document.querySelectorAll('div')].find((e) => e.textContent?.trim() === '2016 · Vera');
  let el = h?.parentElement; while (el && !(el.scrollHeight > el.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(el).overflowY))) el = el.parentElement; return el; })()`;
await page.evaluate(`(() => { const el = ${menuPane}; if (!el) return false;
  el.scrollTop += el.clientHeight - 90;
  const top = el.getBoundingClientRect().top;
  const cut = [...el.querySelectorAll('div, p, button')].filter((d) => d.children.length === 0)
    .find((d) => { const r = d.getBoundingClientRect(); return r.top < top + 2 && r.bottom > top + 2; });
  if (cut) el.scrollTop -= Math.ceil(top - cut.getBoundingClientRect().top) + 4;
  return true; })()`);
await wait(400);
await shot(`02b_menu-your-file-2016_${WAY}`);
await page.evaluate(`(() => { const el = ${menuPane}; if (!el) return; el.scrollTop = el.scrollHeight;
  const top = el.getBoundingClientRect().top;   // and the line cut by the top edge brought down whole (the foot has room for it)
  const cut = [...el.querySelectorAll('div, p, button')].filter((d) => d.children.length === 0)
    .find((d) => { const r = d.getBoundingClientRect(); return r.top < top + 2 && r.bottom > top + 2; });
  if (cut) el.scrollTop -= Math.ceil(top - cut.getBoundingClientRect().top) + 4; })()`);
await wait(400);
await shot(`02c_menu-your-file-2016_${WAY}`);
report.menu = { opened, found, text: await page.evaluate(() => {
  const h = [...document.querySelectorAll('div')].find((e) => e.textContent?.trim() === '2016 · Vera');
  const p = h?.parentElement; if (!p) return '';
  const t = p.innerText; const i = t.indexOf('2016 · Vera'); return i >= 0 ? t.slice(i, t.indexOf('2026 ·', i) > 0 ? t.indexOf('2026 ·', i) : undefined) : '';
}) };
fs.writeFileSync(path.join(OUT, `02_menu-your-file-2016_${WAY}.txt`), report.menu.text);
await page.evaluate(async () => { const { gameMenuBus } = await import('/src/state/gameMenuBus.ts'); gameMenuBus.close(); });
await wait(600);

// ── MOMENT 3: the Close ──
await page.evaluate(() => window.__enterClose?.());
await wait(9000);
const close = await moment('at the Close');

// ── the receipt: the machine's page, Receipt pressed (a real press in the viewer's window), printed, 2016 in view ──
await page.evaluate(() => window.__siteViewer?.bus?.open('machine'));
await wait(1500);
const domPress = async (id) => {
  const at = await page.evaluate((id) => {
    const core = window.__siteViewer.dom, cv = document.querySelector('#reinterp-site-viewer canvas');
    const px = core.centerOf(id); if (!px || !cv) return null;
    const r = cv.getBoundingClientRect(), sz = core.lastSize;
    return { x: r.left + (px.x / sz.w) * r.width, y: r.top + (px.y / sz.h) * r.height };
  }, id);
  if (!at) return false;
  await page.mouse.move(at.x, at.y); await wait(120); await page.mouse.down(); await wait(80); await page.mouse.up();
  return true;
};
const rp = await domPress('m:receipt');
await wait(1500);
const total = await page.evaluate(() => window.__siteViewer?.dom?.receipt?.lines?.length ?? 0);
await wait(Math.ceil(total / 7 * 1000) + 2500);
const lines = await page.evaluate(() => (window.__siteViewer?.dom?.receipt?.lines ?? []).map((l) => (l.right ? `${l.t}  ${l.right}` : l.t)));
fs.writeFileSync(path.join(OUT, `03_receipt_${WAY}.txt`), lines.join('\n'));
// scroll the paper with the wheel (as a visitor reads it) so 2016's block is at the top of the window: the receipt's lines are
//   LH = round(19 × 1.38) apart on its paper (machine.ts ReceiptPrint; 16 × 1.38 when compact), the wheel's delta is in CSS px
const i16 = lines.findIndex((t) => /^2016 ·/.test(t));
const geo = await page.evaluate(() => {
  const core = window.__siteViewer.dom, cv = document.querySelector('#reinterp-site-viewer canvas')?.getBoundingClientRect();
  return cv ? { x: cv.left + cv.width / 2, y: cv.top + cv.height / 2, scale: cv.width / Math.max(1, core.lastSize.w), info: core.info() } : null;
});
if (geo && i16 >= 0) {
  await page.mouse.move(geo.x, geo.y);
  // the paper's line i sits at the window's top + 16 + i × LH − scroll (machine.ts): the blank line above 2016's block at the top
  const LH = Math.round((geo.info.vp.w < 700 ? 16 : 19) * 1.38);
  const target = Math.min(geo.info.maxScroll, Math.max(0, (i16 - 1) * LH + 10));
  const scrollNow = () => page.evaluate(() => window.__siteViewer.dom.info().scroll);
  // one wheel notch to learn how far a CSS pixel moves the paper (and to stop the paper following the printer), then the rest
  const s0 = await scrollNow();
  await page.mouse.wheel({ deltaY: -120 }); await wait(300);
  const s1 = await scrollNow();
  const perPx = s0 !== s1 ? (s0 - s1) / 120 : 1;
  for (let k = 0; k < 3; k++) {
    const now = await scrollNow();
    if (Math.abs(now - target) < 2) break;
    await page.mouse.wheel({ deltaY: (target - now) / perPx }); await wait(400);
  }
  report.receiptScroll = { target, landed: await scrollNow(), perPx, LH, i16 };
  await wait(600);
}
await shot(`03_receipt-2016_${WAY}`);
report.receipt = { pressed: rp, lines: lines.length, block2016: lines.slice(Math.max(0, i16), lines.indexOf('', i16 + 1) > 0 ? lines.indexOf('', i16 + 1) : i16 + 8) };

// ── the checks ──
for (const [name, m] of Object.entries(report.moments)) check(`the pulse equals the file ${name} (${m.pulse} / ${m.file})`, m.pulse === m.file);
const jobs = end2016.jobs;
const row = (j) => `${j.kind}/${j.outcome}${j.flagged ? '/flagged' : ''}`;
if (WAY === 'do') {
  const want = ['testimony/sent', 'places/added', 'checkin/posted', 'testimony/approved', 'recommendation/tagged'];
  check('way 1: five job entries, under their cards, with the outcome words, none flagged', JSON.stringify(jobs.map(row)) === JSON.stringify(want), jobs.map(row).join(' · '));
  check('way 1: four cards', new Set(jobs.map((j) => j.kind)).size === 4, [...new Set(jobs.map((j) => j.card))].join(' · '));
} else {
  const refusals = jobs.filter((j) => j.id === 'refusal');
  const cardOf = { list: 'queue', places: 'places', family: 'moderation', group: 'checkin' };
  const jobOf = (w) => /^list:/.test(w) ? 'list' : /^places:/.test(w) ? 'places' : /^family:/.test(w) ? 'family' : /^group:/.test(w) ? 'group' : '?';
  check('way 2: four refusals filed', refusals.length === 4, refusals.map((r) => r.witness).join(' | '));
  check('way 2: each refusal under the card of the job refused, refused, flagged', refusals.length === 4 && refusals.every((r) => r.kind === cardOf[jobOf(r.witness)] && r.outcome === 'refused' && r.flagged),
    refusals.map((r) => `${jobOf(r.witness)} → ${r.card} (${r.outcome}${r.flagged ? ', flagged' : ''})`).join(' · '));
  check('way 2: the take-down under The testimony', jobs.some((j) => j.id === 'take-down' && row(j) === 'testimony/take-down requested'));
  check('way 2: "video left untagged" declined, flagged', jobs.some((j) => j.id === 'recommend' && row(j) === 'recommendation/declined/flagged'), jobs.filter((j) => j.id === 'recommend').map(row).join(' · '));
  check('way 2: flagged entries first on the Close\'s 2016 panel', close.closePanel.every((e) => e.flagged), close.closePanel.map((e) => e.witness).join(' | '));
  const f16 = (report.receipt.block2016.join(' ').match(/flagged: (\d+)/) || [])[1];
  check(`way 2: the receipt's 2016 line and the file agree on flagged (${f16} / ${close.e3Flagged})`, Number(f16) === close.e3Flagged && close.e3Flagged >= 5);
}
check('the route reached the update notification', step === ROUTE.length && /upd:notify/.test(lastSig), `step ${step}/${ROUTE.length}`);
check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
const fails = report.checks.filter((c) => !c.ok).length;
console.log(`${WAY}: ${report.checks.length - fails} pass, ${fails} fail`);
await Promise.race([browser.close(), wait(8000)]);
process.exit(0);
