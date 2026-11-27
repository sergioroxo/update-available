#!/usr/bin/env node
/**
 * ⚑ S434 (UiB job 40 Part B; his answers to job 38's calls 1–3, 27 Nov) — THE MEMORY PAGE, HER NOTES, BEA'S MALTA CARD, on presses.
 *
 *     node tools/s434-probe.mjs --port 5832 --mode desktop --out <dir>/after --shots      # desktop | xr | phone
 *     node tools/s434-probe.mjs --port 5832 --mode xr --out <dir>/before --shots          # the untouched start commit
 *
 * 2016 played by presses (tools/harness/e3-route.mjs: real mouse presses, the headset mock's controller ray and trigger, or a tap;
 * the fiction's own times run through the app's own update loop, `ff`). The same presses on both builds; where a press is not there
 * (the build before S434 has no press on Bea's card) the check says so and the frame shows what that build does at that moment.
 *
 *  1. THE MEMORY PAGE WAITS FOR HER PRESS — Look back → her story as published; two minutes with no press: still the published story;
 *     See what you wrote → her own words; Close on the right in both states, at the same x; no Lambient (its button not drawn), and the
 *     press makes no sound (every media element's play() is counted).
 *  2. HER NOTES ARE HER OWN VOICE — closing the page: the Notes notification (from Notes, her own unfinished note to Mam); the Start
 *     map's Now and Lambient's asked line at that step and at the Notes' own, quoted; none says a task for the platform.
 *  3. BEA'S MALTA CARD OPENS A PREVIEW, ONLY ON HER TAP — the card is a target in the Handset Window (never in the walk's chain); her tap
 *     opens the messenger's own link reader in the phone's column (nothing on the monitor changes); its lines (the invented masthead,
 *     the card's headline, its fact line, the lines on the law) are drawn whole inside the glass, with their letter heights from the
 *     seat; the news lands meanwhile (nothing held back) and the preview does not count as reading Bea's last message; Back returns to
 *     the group where she was (her scroll kept); during the removal it pauses nothing, it stays readable while the removal reaches the
 *     card, and after Back the card is removed like the others; and 2016 still ends (closing the group → the update).
 *
 * PASS / FAIL per check, report.json; with --shots the stills, 2560 × 1440 (the phone's own portrait, 390 × 844 at 3×).
 */
import fs from 'node:fs';
import path from 'node:path';
import { launch, ff, e3, press, targets, playTo, wait } from './harness/e3-route.mjs';
import { readVisitorState } from './harness/visitor-state.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const MODE = ['xr', 'phone'].includes(flag('mode', 'desktop')) ? flag('mode', 'desktop') : 'desktop';
const OUT = path.resolve(flag('out', `out/s434/${MODE}-${PORT}`));
const SHOTS = argv.includes('--shots');
fs.mkdirSync(OUT, { recursive: true });

// every media element's play() is counted (the memory press must make no sound); the platform's loop is Web Audio, not counted
const init = () => {
  window.__s434plays = [];
  const o = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...a) { window.__s434plays.push(String(this.src || '').split('/').pop()); return o.apply(this, a); };
};
const { browser, page, errors, view } = await launch(PORT, { mode: MODE, scale: MODE === 'phone' ? 1 : 2, width: 1280, height: 720, init });
const report = { port: PORT, mode: MODE, checks: [], stills: [], strings: {}, errors };
const say = (m) => console.log(m);
const check = (part, name, ok, extra = '') => {
  report.checks.push({ part, name, ok: ok === null ? null : !!ok, extra });
  console.log(`${ok === null ? 'NOTE' : ok ? 'PASS' : 'FAIL'}  [${part}] ${name}${extra !== '' ? '  · ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : ''}`);
  return !!ok;
};
const live = async () => new Set((await targets(page, view)).map((t) => t.id));
const tryPress = async (...ids) => { const l = await live(); for (const id of ids) if (l.has(id)) { await press(page, view, id, say); await ff(page, 0.3); return id; } return null; };
const shot = async (n, what) => {
  if (!SHOTS) return;
  await wait(700);   // a few real frames: the screens drawn and uploaded
  const file = `${n}_${what}_${MODE}.png`;
  await page.screenshot({ path: path.join(OUT, file) });
  const s = await e3(page);
  const draws = await page.evaluate(() => window.__drawCalls ?? null);
  report.stills.push({ file, step: s?.chain ?? null, phone: s?.phone?.screen, stage: s?.phone?.stage, page: s?.page, draws });
  say(`still ${file} · step ${s?.chain ?? '-'} · phone ${s?.phone?.screen} · draws ${draws}`);
};
const q = (fn, arg) => page.evaluate(fn, arg);
const mem = () => q(() => window.__graceQueue().memoryState);
const plays = () => q(() => window.__s434plays.length);
const closeRect = () => q(() => { const r = window.__graceQueue().rects.find((x) => x.id === 'memory-close'); return r ? { x: r.x, y: r.y, w: r.w, h: r.h } : null; });
const seeRect = () => q(() => { const r = window.__graceQueue().rects.find((x) => x.id === 'memory-see'); return r ? { x: r.x, y: r.y, w: r.w, h: r.h } : null; });
const phoneState = () => q(() => {
  const g = window.__graceQueue(), p = g.phone;
  return { screen: p.screen, stage: p.stage, newsN: p.newsN, notice: p.noticeId, noticeFrom: p.notice?.from ?? null, noticeText: p.notice?.text ?? null,
    banner: p.banner ? { from: p.banner.from, text: p.banner.text } : null, veil: p.veilBand, removed: [...(p.removed || [])], reviewing: p.reviewing ? { ...p.reviewing } : null,
    view: p.groupView ? { ...p.groupView } : null, tv: p.threadView ? { ...p.threadView } : null, preview: p.screen === 'article' ? (p.previewViews?.['180x310'] ?? null) : null, mirrorBox: g.mirrorBox ? { ...g.mirrorBox } : null, mt: p.mirrorThread ? JSON.parse(JSON.stringify(p.mirrorThread)) : null,
    platform: { mode: g.mode, page: g.veraPage ?? null, job: g.openSurface?.id ?? null, minimised: !!g.minimised, kitPopin: !!g.kitPopin, week: !!g.pauseOpen } };
});

// ── 1. the memory page ──────────────────────────────────────────────────────────────────────────────────────────────────────────
await playTo(page, view, (s) => !!s.card, { log: say, limit: 500 });
check('1', 'the memory card is up (Look back)', (await live()).has('memory-look'));
await tryPress('memory-look');
let m = await mem();
check('1', 'Look back → the memory page, on her story as published', m.page === 'published', m.page);
const close0 = await closeRect(), see0 = await seeRect();
check('1', 'See what you wrote is on the page', !!see0, see0);
check('1', 'Close is on the right, See what you wrote on the left', !!close0 && !!see0 && close0.x > see0.x + see0.w, { close: close0, see: see0 });
check('1', 'no Lambient on the felt page: its button is not drawn and cannot be asked', !(await live()).has('lg-tray') && !(await q(() => window.__graceQueue().guideAskable)));
await shot('01', 'memory-published');
const plays0 = await plays();
await ff(page, 120);
m = await mem();
check('1', 'two minutes with no press: the page still shows her story as published (it no longer turns by itself)', m.page === 'published', `${m.page} · ${m.pageT} s on this face`);
check('1', 'nothing else moved in those two minutes (her Notes have not come)', m.stage === 'idle', m.stage);
await shot('02', 'memory-after-2min');
if (m.page === 'published') {
  const pressed = await tryPress('memory-see');
  m = await mem();
  check('1', 'See what you wrote → her own words, the cuts struck through', !!pressed && m.page === 'own', m.page);
} else check('1', 'See what you wrote → her own words (the page had already turned by itself)', false, m.page);
const close1 = await closeRect();
check('1', 'Close stays on the right, at the same place, once the page has turned', !!close0 && !!close1 && close1.x === close0.x && close1.y === close0.y, { before: close0, after: close1 });
check('1', 'See what you wrote is gone once pressed (Close alone)', !(await seeRect()));
await ff(page, 2);
const plays1 = await plays();
check('1', 'no sound for the press or the turn (no media element played)', plays1 === plays0, `${plays1 - plays0} played${plays1 > plays0 ? ': ' + (await q(() => window.__s434plays.slice(-3))).join(',') : ''}`);
check('1', 'still no Lambient on the turned page', !(await live()).has('lg-tray'));
await shot('03', 'memory-own-words');
await ff(page, 30);
m = await mem();
check('1', 'the turned page waits for her Close (nothing comes over it)', m.page === 'own' && m.stage === 'idle', `${m.page} · ${m.stage}`);

// ── 2. her Notes ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
await tryPress('memory-close');
await ff(page, 0.5);
let p = await phoneState();
check('2', 'Close → a Notes notification on her phone', p.notice === 'notes', p.notice);
report.strings.notesBanner = { from: p.noticeFrom, text: p.noticeText };
check('2', 'the banner is from Notes, and says the start of her own unfinished note to Mam', p.noticeFrom === 'Notes' && /^Mam — /.test(p.noticeText ?? ''), `${p.noticeFrom}: ${p.noticeText}`);
const chainAt = () => q(() => { const c = window.__graceQueue().chainState; return c ? { step: c.step, label: c.label, hint: c.hint, lambient: c.lambient, take: c.take } : null; });
const platformWords = /\b(task|job|lesson|review|reviewer|submit|file|filed|report|platform's|GracePlatform|Lambient|caretender|training)\b/i;
let c = await chainAt();
report.strings.notesNotice = c;
check('2', 'the Start map\'s Now names the Notes step', c?.step === 'notesNotice', c);
check('2', 'its words say the Notes are hers, and ask nothing for the platform', !!c && !platformWords.test(c.label + ' ' + c.hint.replace(/\bthe platform never\b|\bnot the platform\b|\bplatform never sees\b/gi, '')), `"${c?.label}" — "${c?.hint}"`);
check('2', 'Lambient\'s asked line at the Notes step does not point her to the phone or the Notes', !!c && !/phone|notes?\b/i.test(c.lambient), `"${c?.lambient}"`);
await shot('04', 'notes-banner');
if (await tryPress('start-menu')) {
  await ff(page, 0.2);
  await shot('05', 'start-now-notes-notice');
  await tryPress('start-menu'); await ff(page, 0.2);
  if ((await q(() => window.__graceQueue().startMenuOpen))) { await page.keyboard.press('Escape'); await ff(page, 0.2); }
}
if (await tryPress('lg-tray')) {
  for (let i = 0; i < 40 && !(await e3(page)).guide.balloon; i++) await ff(page, 0.5);   // asked, it answers once the phone's voice has ended
  const g = await e3(page);
  report.strings.lambientAtNotes = g.guide.text;
  check('2', 'asked at the Notes step, Lambient says nothing of her phone or her Notes', !!g.guide.text && !/phone|notes?\b/i.test(g.guide.text), `"${g.guide.text}"`);
  await shot('06', 'lambient-asked-at-notes');
  await tryPress('lg-ok', 'lg-x'); await ff(page, 0.3);
} else check('2', 'Lambient\'s button is there to ask, on the board', false);
await tryPress('mirror:evening-banner', 'mirror:lock-notice');
await ff(page, 15);
p = await phoneState();
check('2', 'her tap opens the Notes; her line written', p.screen === 'notes');
c = await chainAt();
report.strings.notes = c;
check('2', 'the Now at her open Notes says they are hers, and asks nothing for the platform', c?.step === 'notes' && !platformWords.test(c.label + ' ' + c.hint.replace(/\bthe platform never\b|\bnot the platform\b|\bplatform never sees\b/gi, '')), `"${c?.label}" — "${c?.hint}"`);
check('2', 'Lambient\'s asked line at the open Notes does not point her to the phone or the Notes', !!c && !/phone|notes?\b/i.test(c.lambient), `"${c?.lambient}"`);
await shot('07', 'notes-open');
if (await tryPress('start-menu')) { await ff(page, 0.2); await shot('08', 'start-now-notes-open'); await tryPress('start-menu'); await ff(page, 0.2); }
if ((await q(() => window.__graceQueue().startMenuOpen))) { await page.keyboard.press('Escape'); await ff(page, 0.2); }

// ── 3. Bea's Malta card ──────────────────────────────────────────────────────────────────────────────────────────────────────────
await tryPress('mirror:back'); await ff(page, 4);
await tryPress('mirror:lock-card:Nuala'); await ff(page, 12);
await tryPress('mirror:evening-banner', 'mirror:lock-notice');
for (let i = 0; i < 40 && (await phoneState()).newsN < 2; i++) await ff(page, 0.5);
await ff(page, 0.5);
p = await phoneState();
check('3', 'the group open, Bea\'s card landed', p.screen === 'group' && p.newsN >= 2, `${p.screen} · newsN ${p.newsN}`);
let vs = await readVisitorState(page, view);
const cardT = vs.targets.find((t) => t.id === 'mirror:malta-open');
check('3', 'Bea\'s card is a press in the Handset Window', !!cardT, cardT ? `${cardT.id} at ${JSON.stringify(cardT.pt)}` : vs.targets.filter((t) => t.id.startsWith('mirror:')).map((t) => t.id).join(','));
check('3', 'the walk\'s chain never presses it (not in e3Wait)', !(vs.e3Wait || []).includes('mirror:malta-open'), JSON.stringify(vs.e3Wait));
await shot('09', 'group-bea-card');
// ⚑ S434b — whole in view: a message's slot (the card and the gap under it) inside the Handset Window's list, above the ▼ pill's strip
const wholeIn = (st, key) => { const m = st.mt, sl = m?.slots?.[key]; return !!sl && sl.y0 >= m.vTop - 0.5 && sl.y1 <= m.vBottom + 0.5; };
// ⚑ S434b — the case with no pill: at rest, the card whole; her tap, and Back at once: the card where it was, whole, and no ▼ pill
if (cardT) {
  const r0 = await phoneState();
  await tryPress('mirror:malta-open');
  const inPrev = (await phoneState()).screen === 'article';
  if (inPrev) await tryPress('mirror:back');
  await ff(page, 0.2);
  const r1 = await phoneState();
  check('3b', 'no pill: at rest, the card tapped and Back at once — the card whole where it was, no ▼ pill, the place unchanged',
    inPrev && r1.screen === 'group' && wholeIn(r1, 'n1') && !r1.mt.latest && (r1.newsN !== r0.newsN || (r1.view?.scrollBack === r0.view?.scrollBack && r1.mt.slots.n1.y0 === r0.mt?.slots?.n1?.y0)),
    { slot: r1.mt?.slots?.n1, list: [r1.mt?.vTop, r1.mt?.vBottom], pill: r1.mt?.latest, before: r0.mt?.slots?.n1 });
}
// her place: one line up (the wheel's step), so Back can prove it is kept
await q(() => { const ph = window.__graceQueue().phone; ph.scrollLines(-1); });
await ff(page, 0.2);
const before = await phoneState();
const monitorBefore = before.platform;
const opened = cardT ? await tryPress('mirror:malta-open') : null;
await ff(page, 0.2);
p = await phoneState();
check('3', 'her tap opens the preview, in the phone (the messenger\'s own link reader)', !!opened && p.screen === 'article', p.screen);
check('3', 'nothing opens on the monitor (the platform\'s page, job, cards as they were)', JSON.stringify(p.platform) === JSON.stringify(monitorBefore), { before: monitorBefore, after: p.platform });
check('3', 'in the Handset Window\'s own column (the same window, the same place)', JSON.stringify(p.mirrorBox) === JSON.stringify(before.mirrorBox), p.mirrorBox);
const pv = p.preview;
if (pv) {
  report.strings.preview = pv.lines.map((l) => l.t);
  const txt = pv.lines.map((l) => l.t).join(' ');
  const L = await q(async () => { const d = (await import('/data/dialog/s3_maiden.json')).default; return d.linkVote; });
  const norm = (s) => s.replace(/·/g, ' ').replace(/\s+/g, ' ').trim();
  check('3', 'it shows the invented masthead', txt.includes(L.masthead), L.masthead);
  check('3', 'it shows the card\'s headline', norm(txt).includes(norm(L.headline)), L.headline);
  check('3', 'it shows the card\'s fact line', norm(txt).includes(norm(L.fact)), L.fact);
  check('3', 'and lines on what the law does (at least two)', pv.body >= 2, `${pv.body} body lines of ${pv.lines.length}`);
  check('3', 'every line whole inside the glass (none cut by an edge, none hidden)', pv.lines.every((l) => l.y0 >= pv.top - 0.5 && l.y1 <= pv.H + 0.5 && l.x0 >= 0 && l.x1 <= pv.W + 0.5) && pv.dropped === 0,
    { H: pv.H, W: pv.W, last: pv.lines[pv.lines.length - 1], dropped: pv.dropped });
  check('3', 'no Lambient and no platform voice in it', !/Lambient|GracePlatform|Grace/i.test(txt), txt.slice(0, 80));
  check('3', 'no real outlet or organisation in it (the masthead is invented)', !/Guardian|Parliament of Malta|legislation\.mt|parlament/i.test(txt));
  check('3', 'Back is there (the app bar\'s chevron)', (await live()).has('mirror:back'));
  // letter heights: the phone's font sizes → cap height (measured with the phone's own face) → the Handset Window's scale → the monitor
  const letters = await q(([sizes]) => {
    const g = window.__graceQueue(), b = g.mirrorBox, app = window.__app, ws = app.root.findByName('era3-device-workstation');
    const cv = document.createElement('canvas').getContext('2d');
    const cap = (s, w) => { cv.font = `${w} ${s}px -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif`; const mm = cv.measureText('H'); return mm.actualBoundingBoxAscent + mm.actualBoundingBoxDescent; };
    const V = app.root.getPosition().constructor, c = window.__xrComfort;
    const at = (x, z) => { const o = new V(); ws.getWorldTransform().transformPoint(new V(x, 0, z), o); return c?.physicalPoint && app.xr?.active ? c.physicalPoint(o) : o; };
    let camE = null; app.root.forEach((e) => { if (e.camera && e.enabled) camE = e; });
    const E = camE.getPosition();
    const top = at(0, -0.5), bot = at(0, 0.5);
    const monDeg = Math.acos(Math.max(-1, Math.min(1, top.clone().sub(E).normalize().dot(bot.clone().sub(E).normalize())))) * 180 / Math.PI;
    const st = camE.camera.worldToScreen(top), sb = camE.camera.worldToScreen(bot), monPx = Math.abs(sb.y - st.y) * (window.devicePixelRatio || 1);
    return { monitorDeg: +monDeg.toFixed(2), monitorStillPx: Math.round(monPx), scale: b?.scale ?? null,
      sizes: sizes.map(([s, w, what]) => { const k = cap(s, w) * (b?.scale ?? 1) / 390; return { what, size: s, capDeg: +(monDeg * k).toFixed(3), capQuestPx: +(monDeg * k * 25).toFixed(1), capStillPx: +(monPx * k).toFixed(1) }; }),
      monitorBody: { what: "the monitor's own body text (8 of 390 rows)", capDeg: +(monDeg * 8 / 390).toFixed(3), capQuestPx: +(monDeg * 8 / 390 * 25).toFixed(1), capStillPx: +(monPx * 8 / 390).toFixed(1) } };
  }, [[...new Map(pv.lines.map((l) => [l.size + ':' + l.weight, [l.size, l.weight, l.role]])).values()]]);
  report.letters = letters;
  check('3', 'letter heights from the seat (cap height; degrees, ≈ px at a Quest 3 lens centre, px in this still)', null, letters);
  const smallest = Math.min(...letters.sizes.map((x) => x.capDeg));
  check('3', 'its smallest letters are at least the monitor\'s own body text from the seat', smallest >= letters.monitorBody.capDeg - 0.005, `${smallest}° vs ${letters.monitorBody.capDeg}°`);
} else {
  check('3', 'the preview\'s lines (none: no preview on this build)', false);
}
await shot('10', 'malta-preview');
// nothing held back, and the preview is not reading: Bea's news lands meanwhile, the last message's reading time does not count here
const n0 = p.newsN;
await ff(page, 40);
p = await phoneState();
check('3', 'the news goes on landing while the preview is open (nothing held back)', p.newsN > n0 || p.newsN === 5, `newsN ${n0} → ${p.newsN}`);
check('3', 'the preview does not count as reading Bea\'s last message (no kit while it is open)', p.screen !== 'article' || (p.stage === 'news' && !p.platform.kitPopin), `${p.stage} · kit ${p.platform.kitPopin}`);
check('3', 'no group banner over the preview while it is open', p.screen !== 'article' || (!p.banner && !p.veil), JSON.stringify(p.banner));
await shot('11', 'preview-while-news-lands');
if (p.screen === 'article') await tryPress('mirror:back');
await ff(page, 0.2);
p = await phoneState();
check('3', 'Back → the group', p.screen === 'group', p.screen);
{ const s0 = before.mt?.slots?.n1, s1 = p.mt?.slots?.n1;
  check('3b', 'Bea\'s card cut at the foot before her tap (her place, one line up): the case of frame 12', !!s0 && !(s0.y1 <= (before.mt?.vBottom ?? 0) + 0.5), { slot: s0, list: [before.mt?.vTop, before.mt?.vBottom] });
  check('3b', 'back from the preview, the card she tapped stands whole in view, its foot above the ▼ pill', wholeIn(p, 'n1') && !!p.mt?.latest, { slot: s1, list: [p.mt?.vTop, p.mt?.vBottom], pill: p.mt?.latest, unseen: p.view?.unseen });
  check('3', 'where she was: her place kept (hers, what landed counted below her), shifted only as far as the card needs', !!p.view?.userScrolled && !!s0 && !!s1 && Math.abs(s1.y0 - s0.y0) <= s1.y1 - s1.y0,
    { shift: s0 && s1 ? s0.y0 - s1.y0 : null, slotHeight: s1 ? s1.y1 - s1.y0 : null, unseen: p.view?.unseen }); }
await shot('12', 'back-in-group');
await q(() => window.__graceQueue().phone.pressControl('scroll-down'));
for (let i = 0; i < 40 && !(await e3(page)).kitPopin; i++) await ff(page, 1);
check('3', 'back in the group, the last message read: the kit pops in (the preview held nothing back)', (await e3(page)).kitPopin);
// the removal: the kit, Back to today, the group's notification, the review; the card tapped while the review is under way
await playTo(page, view, (s) => s.page === 'kit', { log: say, limit: 40 });
await tryPress('vera-kit-approve'); await tryPress('vera-kit-close'); await ff(page, 0.5);
await tryPress('mirror:evening-banner', 'mirror:lock-notice'); await ff(page, 0.3);
p = await phoneState();
check('3', 'the review runs in the group', p.stage === 'takeover', p.stage);
const removed0 = p.removed.length;
// the review takes the card in hand first (its outline): her tap then, with the platform's hand on it
for (let i = 0; i < 80 && (await phoneState()).reviewing?.key !== 'n1'; i++) await ff(page, 0.1);
check('3', 'the review has Bea\'s card in its hand (outlined), the card brought into view', (await phoneState()).reviewing?.key === 'n1', JSON.stringify((await phoneState()).reviewing));
const opened2 = await tryPress('mirror:malta-open');
p = await phoneState();
check('3', 'during the removal her tap still opens the preview (the card not yet taken)', !!opened2 && p.screen === 'article', p.screen);
let reached = false;
for (let i = 0; i < 120 && !reached; i++) { await ff(page, 0.5); const r = await phoneState(); reached = r.removed.includes('n1') || (r.reviewing?.key === 'n1' && r.reviewing.phase === 'grey'); }
p = await phoneState();
check('3', 'the removal pauses nothing: it reaches the card (greys or folds it) while the preview is open', reached, `removed ${removed0} → ${p.removed.length} (${p.removed.join(',')}) · in hand ${JSON.stringify(p.reviewing)}`);
check('3', 'the preview stays on her glass, readable, until she goes Back', p.screen === 'article' && !!p.preview && p.preview.dropped === 0 && !p.banner && !p.veil, `${p.screen} · banner ${JSON.stringify(p.banner)}`);
await shot('13', 'preview-as-removal-reaches-card');
for (let i = 0; i < 20 && !(await phoneState()).removed.includes('n1'); i++) await ff(page, 0.5);
if ((await phoneState()).screen === 'article') await tryPress('mirror:back');
await ff(page, 0.3);
p = await phoneState();
check('3', 'Back → the group, the card removed like the others', p.screen === 'group' && p.removed.includes('n1'), `${p.screen} · ${p.removed.join(',')}`);
check('3b', 'the removal case: no reveal for a removed card; every line of the message in the review\'s hand whole in view (the review\'s own hold, S426/S429b)', !p.reviewing || (p.mt?.whole ?? []).includes(p.reviewing.key), { hand: p.reviewing, whole: p.mt?.whole, slot: p.reviewing ? p.mt?.slots?.[p.reviewing.key] : null, list: [p.mt?.vTop, p.mt?.vBottom] });
check('3', 'the removed card is no longer a press', !(await live()).has('mirror:malta-open'));
// the frame: once the review has moved on to Bea's next message, the thread shows the card folded among the others
for (let i = 0; i < 60 && !['n2', 'n3'].includes((await phoneState()).reviewing?.key); i++) await ff(page, 0.25);
await shot('14', 'back-card-removed');
await ff(page, 120);
p = await phoneState();
check('3', 'the review still ends: "Review could not keep up."', p.stage === 'after', p.stage);
await tryPress('mirror:back'); await ff(page, 3);
check('3', 'closing the group brings the update (2016 still ends)', (await e3(page)).update);

report.errors = errors;
check('-', 'console: no errors', errors.length === 0, errors.slice(0, 3).join(' | '));
const fails = report.checks.filter((x) => x.ok === false).length, passes = report.checks.filter((x) => x.ok === true).length;
report.pass = fails === 0; report.counts = { pass: passes, fail: fails };
fs.writeFileSync(path.join(OUT, `report_${MODE}.json`), JSON.stringify(report, null, 1));
console.log(`S434 PROBE (${MODE}): ${passes} PASS, ${fails} FAIL`);
await browser.close();
process.exit(0);
