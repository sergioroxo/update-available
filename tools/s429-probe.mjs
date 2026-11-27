#!/usr/bin/env node
/**
 * ⚑ S429 (UiB job 38 part two: C, F) — HIS MARKS ON THE PAGES AND THE PHONE, AND THE FOUR FAULTS IN S428'S PICTURES, PROVED ON PRESSES.
 *
 *     node tools/s429-probe.mjs --port 5811 --mode desktop [--shots <dir>] [--build after]     # desktop | xr | phone
 *
 * 2016 played by presses (tools/harness/e3-route.mjs: real mouse presses, the headset mock's ray and trigger, or a tap; the fiction's
 * own times run through the app's own update loop), the same presses on every build; where a press is not there nothing is pressed and
 * the check reads what that build does at that moment. Each check reads the build from the outside — the words the workstation
 * actually wrote (its canvas's fillText, caught for one redraw), the pixels of the Handset Window and the workstation, the controls it
 * published — so it fails where the old build had the fault and passes where it is fixed:
 *   C1  the group and Orla's thread: the largest band of empty thread (rows of the thread's ground, full width) at rest and scrolled
 *       up; a scroll by the wheel (computer) / the thumbstick (headset mock) / ▲ (touch) moves the thread; ▼ comes back
 *   C2  Lesson 2 finished: Back to Today clear of the Trending panel (in the left column)
 *   C3  Lesson 3: seconds from Lambient's send to Annette on the screen; Lambient saying it answered
 *   C4  the memory page's Close: its right edge in both states, on the right
 *   C5  the Handset Window's taskbar button: not published
 *   C6  the take-down page: its heading says what happened (the words drawn)
 *   C7  Lesson 1: "20" said once (the words drawn)
 *   C8  the consent card: no wake word (the words drawn)
 *   F1  every banner seen over a screen: dark (ink) pixels in the two rows under its lower edge (a line cut in half shows there)
 *   F2  Lambient's asked line on the board and each lesson's page: what it says, the balloon fitted to its words (no band), and no line
 *       of the page cut by its top or bottom edge (ink pixels in the two rows outside each edge)
 *   F3  the phone's and the taskbar's clock: the hour padded
 *   F4  the Start menu's foot: the band between the menu and Start is the menu's own paper (no mark of the page under it)
 * Writes <out>/s429-probe_<mode>_<build>.json; with --shots, the stills (2560 × 1440; the phone's own portrait) named NN_<what>_<mode>.png.
 */
import fs from 'node:fs';
import path from 'node:path';
import { launch, ff, e3, press, targets, playTo, wait } from './harness/e3-route.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const MODE = ['xr', 'phone'].includes(flag('mode', 'desktop')) ? flag('mode', 'desktop') : 'desktop';
const SHOTS = flag('shots', null) ? path.resolve(flag('shots')) : null;
const BUILD = flag('build', String(PORT));
const OUT = path.resolve(flag('out', 'out/s429'));
fs.mkdirSync(OUT, { recursive: true }); if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const { browser, page, errors, view } = await launch(PORT, { mode: MODE, scale: SHOTS ? 2 : 1, width: 1280, height: 720 });
const say = (m) => console.log(m);
const result = { port: PORT, mode: MODE, build: BUILD, checks: [], banners: [], stills: [], errors };
const check = (id, what, ok, detail) => { result.checks.push({ id, what, ok: ok === null ? null : !!ok, detail }); say(`${ok === null ? 'n/a ' : ok ? 'PASS' : 'FAIL'} ${id} ${what} — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`); };
const live = async () => new Set((await targets(page, view)).map((t) => t.id));
const tryPress = async (...ids) => { const l = await live(); for (const id of ids) if (l.has(id)) { await press(page, view, id); await ff(page, 0.3); return id; } return null; };
const q = (fn, arg) => page.evaluate(fn, arg);
const shot = async (n, what) => {
  if (!SHOTS) return;
  await wait(700);
  const file = `${n}_${what}_${MODE}.png`;
  await page.screenshot({ path: path.join(SHOTS, file) });
  const draws = await q(() => window.__drawCalls ?? null);
  result.stills.push({ file, draws });
  say(`still ${file} · draws ${draws}`);
};

// ── what the workstation writes: its canvas's own words, caught for one redraw ──
await q(() => {
  const proto = CanvasRenderingContext2D.prototype, orig = proto.fillText;
  // ⚑ S429c (H1) — the workstation's filled rectangles and pictures, where (logical px), while `__rectsAt` is set
  const origRect = proto.fillRect, origImage = proto.drawImage;
  const note = (c, x, y, w, h) => {
    const m = c.getTransform(), k = c.canvas.width / 676, x0 = (m.a * x + m.e) / k, x1 = (m.a * (x + w) + m.e) / k, y0 = (m.d * y + m.f) / k, y1 = (m.d * (y + h) + m.f) / k;
    window.__rectsAt.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: Math.min(y0, y1), y1: Math.max(y0, y1) });
  };
  proto.fillRect = function (x, y, w, h) { if (window.__rectsAt && this.canvas === window.__era3Devices?.()?.workstation) note(this, x, y, w, h); return origRect.call(this, x, y, w, h); };
  proto.drawImage = function (...a) {
    if (window.__rectsAt && this.canvas === window.__era3Devices?.()?.workstation) {
      const [dx, dy, dw, dh] = a.length >= 9 ? [a[5], a[6], a[7], a[8]] : a.length >= 5 ? [a[1], a[2], a[3], a[4]] : [a[1], a[2], a[0]?.width ?? 0, a[0]?.height ?? 0];
      note(this, dx, dy, dw, dh);
    }
    return origImage.apply(this, a);
  };
  window.__drawn = null;
  proto.fillText = function (t, x, y, mw) {
    if (window.__drawn && this.canvas === window.__era3Devices?.()?.workstation) window.__drawn.push(String(t));
    if (window.__phoneText && this.canvas === window.__graceQueue?.()?.mirrorCanvas) {   // S429c: the phone's own words (H2)
      const m = this.getTransform(), k = this.canvas.width / 180; window.__phoneText.push({ s: String(t), y: (m.d * y + m.f) / k });
    }
    if (window.__drawnAt && this.canvas === window.__era3Devices?.()?.workstation) {   // S429b: where (logical px), for G2
      const m = this.getTransform(), k = this.canvas.width / 676, w = this.measureText(String(t)).width;
      const size = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 11), bl = this.textBaseline;
      const top = bl === 'top' || bl === 'hanging' ? y : bl === 'middle' ? y - size * 0.6 : y - size;
      const x0 = this.textAlign === 'center' ? x - w / 2 : this.textAlign === 'right' || this.textAlign === 'end' ? x - w : x;
      window.__drawnAt.push({ s: String(t), x0: (m.a * x0 + m.e) / k, x1: (m.a * (x0 + w) + m.e) / k, y: (m.d * y + m.f) / k,
        g0: (m.d * (top + size * 0.1) + m.f) / k, g1: (m.d * (top + size) + m.f) / k });
    }
    return mw === undefined ? orig.call(this, t, x, y) : orig.call(this, t, x, y, mw);
  };
});
const drawnWords = async () => {
  await q(() => { window.__drawn = []; const g = window.__graceQueue(); g.bump?.(); });
  await wait(350);
  return q(() => { const d = window.__drawn || []; window.__drawn = null; return d; });
};
// ── pixels ──
/** the Handset Window's phone (its own 2× canvas): the largest band of full-width rows of the thread's ground inside [y0, y1) (logical).
 *  ⚑ S429b — at most 30 px passes: whole lines only (G1) leave up to a line and its gap of bare thread at the list's edge; the band he
 *  saw was 74–81 px */
const phoneBand = (y0, y1) => q(({ y0, y1 }) => {
  const g = window.__graceQueue(), cv = g.mirrorCanvas; if (!cv) return null;
  const c = cv.getContext('2d'), s = cv.width / 180, d = c.getImageData(0, 0, cv.width, cv.height).data, W = cv.width;
  const at = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
  const ground = at(2 * s, Math.round(y1 * s) - 2);   // the thread's ground at the list's foot, at its left margin
  let best = 0, run = 0, bestAt = -1;
  for (let y = Math.round(y0 * s); y < Math.round(y1 * s); y++) {
    let plain = true;
    for (let x = Math.round(4 * s); x < Math.round(150 * s); x += 2) { const p = at(x, y); if (Math.abs(p[0] - ground[0]) + Math.abs(p[1] - ground[1]) + Math.abs(p[2] - ground[2]) > 12) { plain = false; break; } }
    if (plain) { run++; if (run > best) { best = run; bestAt = y - run + 1; } } else run = 0;
  }
  return { band: Math.round(best / s), at: Math.round(bestAt / s) };
}, { y0, y1 });
/** dark (ink) pixels in phone rows [y0, y1) (logical) across x 8…150 */
const phoneInk = (y0, y1) => q(({ y0, y1 }) => {
  const cv = window.__graceQueue().mirrorCanvas; if (!cv) return null;
  const c = cv.getContext('2d'), s = cv.width / 180, d = c.getImageData(0, Math.round(y0 * s), cv.width, Math.max(1, Math.round((y1 - y0) * s))).data;
  let n = 0; for (let i = 0; i < d.length; i += 4) { const x = (i / 4) % cv.width; if (x < 8 * s || x > 150 * s) continue; if (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2] < 120) n++; }
  return n;
}, { y0, y1 });
/** dark (ink) pixels in workstation rows [y0, y1) (logical) across x [x0, x1) */
const wsInk = (x0, x1, y0, y1) => q(({ x0, x1, y0, y1 }) => {
  const cv = window.__era3Devices().workstation, s = cv.width / 676, c = cv.getContext('2d');
  const d = c.getImageData(Math.round(x0 * s), Math.round(y0 * s), Math.max(1, Math.round((x1 - x0) * s)), Math.max(1, Math.round((y1 - y0) * s))).data;
  let n = 0; for (let i = 0; i < d.length; i += 4) if (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2] < 140) n++;
  return n;
}, { x0, x1, y0, y1 });
/** the banner over the phone's screen now: its lower edge (logical), worked out as the banner draws itself (theme/phone.ts) */
const bannerNow = () => q(async () => {
  const g = window.__graceQueue(), p = g.phone, b = p.notice ?? p.banner;
  if (!b || p.bannersHidden || p.screen === 'lock' || p.conductingNotes || g.floppy?.open || !g.mirrorCanvas) return null;
  const { phoneFont, phoneWrap } = await import('/src/desktop/theme/phone.ts');
  const c = document.createElement('canvas').getContext('2d'); phoneFont(c, 12);
  const lines = phoneWrap(c, b.text, 180 - 12 - 20).slice(0, 3);
  const photo = !p.notice && p.evening?.some?.((e) => e === b && e.photo === true);
  return { from: b.from, text: b.text.slice(0, 40), screen: p.screen, bottom: 22 + 32 + lines.length * 16 + (photo ? 78 : 0) + 1 };
});
const bannerCheck = async (label, must = false) => {
  await wait(300);
  const b = await bannerNow();
  if (!b) { if (must) check('F1', `a banner ${label}`, null, 'no banner on this build here'); return null; }
  if (b.screen === 'home') {   // the wallpaper is dark: the ink test cannot read it; the first row of app pictures goes under the banner
    result.banners.push({ label, ...b, ink: null });
    check('F1', `the banner ${label} (${b.from} over the home screen)`, null, 'over the app pictures and the wallpaper (no line of words under its edge; the eye checks the still)');
    return null;
  }
  const ink = await phoneInk(b.bottom, b.bottom + 2);
  result.banners.push({ label, ...b, ink });
  // ⚑ S429c (H2) — a preview shortened to fit ends with "…" (one that fits whole gets none)
  const pv = await q(async () => {
    const G = window.__graceQueue(), p = G.phone, bb = p.notice ?? p.banner;
    const { phoneFont, phoneWrap } = await import('/src/desktop/theme/phone.ts');
    const c = document.createElement('canvas').getContext('2d'); phoneFont(c, 12);
    const all = phoneWrap(c, bb.text, 180 - 12 - 20);
    window.__phoneText = []; G.phoneV = (G.phoneV ?? 0) + 1; G.bump?.();
    await new Promise((r) => setTimeout(r, 350));
    const drawn = window.__phoneText.filter((t) => t.y > 40 && t.y < 22 + 32 + 3 * 16 + 2).map((t) => t.s); window.__phoneText = null;
    return { long: all.length > 3, drawn };
  });
  const last = pv.drawn[pv.drawn.length - 1] ?? '';
  check('H2', `the banner ${label}: a shortened preview ends with "…"`, pv.long ? last.endsWith('…') : null, pv.long ? `its last line "${last}"` : `it fits whole (last line "${last}"; no "…" needed)`);
  if (SHOTS) {   // the Handset Window's phone as drawn, for the eye (its own 2× canvas)
    const png = await q(() => window.__graceQueue().mirrorCanvas.toDataURL('image/png'));
    fs.writeFileSync(path.join(SHOTS, `phone_banner-${label.replace(/[^a-z0-9]+/gi, '-')}_${MODE}.png`), Buffer.from(png.split(',')[1], 'base64'));
  }
  check('F1', `the banner ${label} (${b.from} over ${b.screen}) cuts no line`, ink === 0, `ink in the two rows under its edge: ${ink}`);
  return ink;
};
// ── Lambient's asked line ──
const asked = async (where, expect, still = null) => {
  if (!(await tryPress('lg-tray'))) { check('F2', `Lambient's button on ${where}`, false, 'not published'); return; }
  for (let i = 0; i < 20 && !(await q(() => !!window.__graceQueue().lambyGuidePaint?.balloon)); i++) await ff(page, 1);
  await wait(400);
  const g = await q(async () => {
    const G = window.__graceQueue(), box = G.lambyGuidePaint?.box ?? null, text = window.__os?.lambyGuide?.view?.text ?? null;
    if (!box || !text) return { box, text };
    const ui = await import('/src/desktop/theme/chrome.ts'), c = document.createElement('canvas').getContext('2d');
    ui.setFont(c, 11); const n = ui.wrapText(c, text, box.w - 36).length;
    const re = /^(board-back|vera-send|vera-send-close|apply|skip|places-add|places-refuse|family-reply-|family-refuse|consent-|week-begin|pause-close|memory-|kit-popin-open|vera-kit|vera-take)/;
    // the page's presses as published, and (Lesson 3 while Lambient shows how) its replies as drawn: read off the job itself
    const buttons = G.rects.filter((r) => re.test(r.id)).map((r) => ({ id: r.id, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) }));
    return { box, text, lines: n, buttons };
  });
  if (!g.box) { check('F2', `Lambient's balloon on ${where}`, false, 'no balloon'); return; }
  const fit = g.box.h - (49 + g.lines * 15);
  if (still) await shot(still[0], still[1]);
  // the page under it, read without it: the balloon put away (Got it), the page drawn again, then its edges tested against the page's
  //   own rows of ink — a run of ink rows that goes on across the top or the foot is a line cut there; ink right and left of its side
  //   in the same rows is a line cut by the side
  await tryPress('lg-ok', 'lg-x'); await ff(page, 0.3); await wait(400);
  if (SHOTS) {   // the page without it, the balloon's box drawn in, for the eye
    const png = await q((b) => { const cv = window.__era3Devices().workstation, s = cv.width / 676, o = document.createElement('canvas'); o.width = cv.width; o.height = cv.height;
      const c = o.getContext('2d'); c.drawImage(cv, 0, 0); c.strokeStyle = '#ff00ff'; c.lineWidth = 1; c.strokeRect(b.x * s + 0.5, b.y * s + 0.5, b.w * s, b.h * s); return o.toDataURL('image/png'); }, g.box);
    fs.writeFileSync(path.join(SHOTS, `ws_balloon-${where.replace(/[^a-z0-9]+/gi, '-')}_${MODE}.png`), Buffer.from(png.split(',')[1], 'base64'));
  }
  // the page's own lines as it writes them (the balloon put away): a line crossing its top or foot, or crossing its side, is cut
  const cut = await q(async (b) => {
    window.__drawnAt = []; window.__rectsAt = []; window.__graceQueue().bump?.();
    await new Promise((r) => setTimeout(r, 350));
    const L = window.__drawnAt.filter((l) => l.s.trim() && l.x1 - l.x0 > 1 && l.y < 390 - 28); window.__drawnAt = null;
    const R = window.__rectsAt; window.__rectsAt = null;
    // ⚑ S429c (H1) — the page's items: the window's body (its largest fill under the title bar, 9 px gutter inside it) gives the content
    //   edges; a fill of 12 px or more inside it, not the body's own ground, is an item; one with a dozen fills inside it is a picture
    const body0 = R.filter((r) => r.y0 > 12 && r.y0 < 40 && r.x0 < 20).sort((p, q2) => (q2.x1 - q2.x0) * (q2.y1 - q2.y0) - (p.x1 - p.x0) * (p.y1 - p.y0))[0];
    const cL = body0 ? body0.x0 + 9 : 13, cR = body0 ? body0.x1 - 9 : 477, cW = cR - cL, cH = body0 ? body0.y1 - body0.y0 : 330, cY = body0 ? body0.y0 : 26;
    const inside = (a, c) => a.x0 >= c.x0 - 0.5 && a.x1 <= c.x1 + 0.5 && a.y0 >= c.y0 - 0.5 && a.y1 <= c.y1 + 0.5;
    const meets = (a, c) => a.x0 < c.x1 - 0.5 && a.x1 > c.x0 + 0.5 && a.y0 < c.y1 - 0.5 && a.y1 > c.y0 + 0.5;
    const sized = R.filter((r) => r.x1 - r.x0 >= 12 && r.y1 - r.y0 >= 12 && r.y0 >= cY - 1 && r.x1 - r.x0 < cW * 0.9 && (r.x1 - r.x0) * (r.y1 - r.y0) < cW * cH * 0.3);
    const pics = sized.filter((p) => R.filter((r) => r !== p && inside(r, p)).length >= 12);
    const items = sized.filter((r) => !pics.includes(r) && !pics.some((p) => inside(r, p)));
    const box = { x0: b.x, x1: b.x + b.w, y0: b.y, y1: b.y + b.h }, tl = Math.max(b.x + 8, Math.min(b.x + b.w - 8, 490 - 182 + 7));
    const tail = { x0: tl, x1: tl + 6, y0: b.y + b.h, y1: b.y + b.h + 6 };
    const text = L.map((l) => ({ x0: l.x0, x1: l.x1, y0: l.g0, y1: l.g1, s: l.s }));
    const sliced = [...items, ...text].filter((r) => (meets(r, box) && !inside(r, box)) || meets(r, tail)).map((r) => r.s ? `"${r.s}"` : `item ${Math.round(r.x0)},${Math.round(r.y0)} ${Math.round(r.x1 - r.x0)}×${Math.round(r.y1 - r.y0)}`);
    const picsCut = pics.filter((p) => meets(p, box) || meets(p, tail)).map((p) => `${Math.round(p.x0)},${Math.round(p.y0)} ${Math.round(p.x1 - p.x0)}×${Math.round(p.y1 - p.y0)}`);
    const edges = [cL, cR, ...items.map((r) => r.x0), ...text.map((r) => r.x0)];
    const aligned = Math.abs(b.x + b.w - cR) <= 1 || Math.abs(b.x - cL) <= 1 || edges.some((e) => Math.abs(b.x - e) <= 1);
    const covered = [...items, ...text].filter((r) => inside(r, box));
    const twoCols = covered.some((a) => covered.some((c) => a.x1 + 6 < c.x0 && a.y1 > c.y0 && a.y0 < c.y1));
    const h1 = { sliced, picsCut, aligned, twoCols, content: [Math.round(cL), Math.round(cR)] };
    const inX = (l) => l.x1 > b.x + 1 && l.x0 < b.x + b.w - 1, inY = (l) => l.g1 > b.y && l.g0 < b.y + b.h;
    const thru = (l, e) => l.g0 < e - 0.5 && l.g1 > e + 0.5;
    const top = L.filter((l) => inX(l) && thru(l, b.y)).map((l) => l.s), foot = L.filter((l) => inX(l) && thru(l, b.y + b.h)).map((l) => l.s);
    const side = L.filter((l) => inY(l) && (l.x0 < b.x - 0.5 && l.x1 > b.x + 0.5)).map((l) => l.s);
    return { top, foot, side, h1 };
  }, g.box);
  check('H1', `on ${where} the balloon covers only whole items, in one column, its side on a column or content edge`,
    !cut.h1.sliced.length && cut.h1.aligned && !cut.h1.twoCols,
    `sliced: ${cut.h1.sliced.slice(0, 6).join(', ') || 'none'}; side ${g.box.x}–${g.box.x + g.box.w} against the content ${cut.h1.content.join('–')}${cut.h1.aligned ? ' (aligned)' : ' (NOT aligned)'}; ${cut.h1.twoCols ? 'TWO columns' : 'one column'}`);
  check('H1', `on ${where} a picture covered only in part`, null, cut.h1.picsCut.length ? `part of the picture at ${cut.h1.picsCut.join('; ')}` : 'none');
  // ⚑ S429b (G2) — the presses the page asks for (its sends, replies, adds, leaves, Back to Today, the cards' answers): none under it.
  //   Read twice: the buttons it publishes, and the words of its buttons as drawn (Lesson 3's replies are drawn, not yet pressable,
  //   while Lambient shows how)
  const labels = await q(async () => {
    const fam = (await import('/data/dialog/s3_family.json')).default;
    const L = [...(fam.replies ?? []).map((r) => r.label), fam.app?.noReplyLabel].filter(Boolean);
    window.__drawnAt = []; window.__graceQueue().bump?.();
    await new Promise((r) => setTimeout(r, 350));
    const d = window.__drawnAt; window.__drawnAt = null;
    return d.filter((w) => w.s.length > 3 && L.some((l) => l.startsWith(w.s))).map((w) => ({ id: 'label:' + w.s, x: Math.round(w.x0), y: Math.round(w.g0), w: Math.round(w.x1 - w.x0), h: Math.round(w.g1 - w.g0) }));
  });
  const under = [...g.buttons, ...labels].filter((r) => r.x < g.box.x + g.box.w && r.x + r.w > g.box.x && r.y < g.box.y + g.box.h + 6 && r.y + r.h > g.box.y);
  check('G2', `on ${where} the balloon lies over none of the page's presses`, under.length === 0, under.length ? `over ${[...new Set(under.map((r) => r.id))].join(', ')}` : `clear of ${[...new Set([...g.buttons, ...labels].map((r) => r.id))].join(', ') || '(none on the page)'}`);
  if (expect) check('F2', `on ${where} the asked line speaks to it`, g.text === expect, `"${g.text}"`);
  else check('F2', `on ${where} the asked line`, null, `"${g.text}"`);
  check('F2', `on ${where} the balloon fits its words`, fit <= 1, `h ${g.box.h} for ${g.lines} lines (${fit} px of band)`);
  check('F2', `on ${where} the balloon's edges cut no line of the page`, !cut.top.length && !cut.foot.length && !cut.side.length,
    `lines through its top [${cut.top.join(' | ')}], its foot [${cut.foot.join(' | ')}], its side [${cut.side.join(' | ').slice(0, 120)}]; it sits at x ${g.box.x}, y ${g.box.y}, ${g.box.w} × ${g.box.h}`);
  result[`balloon_${where}`] = g;
  return g;
};
const dismiss = async () => { await tryPress('lg-ok', 'lg-x', 'lg-later'); await ff(page, 0.5); };
// ── the thread's scroll, the way each look-mode does it ──
const threadO = () => q(() => window.__graceQueue().phone.threadView?.O ?? window.__graceQueue().phone.groupView?.scrollBack ?? null);
const scrollUp = async () => {
  if (MODE === 'desktop') {
    const t = (await targets(page, view)).find((x) => x.id === 'mirror:back');
    if (!t) return 'no thread';
    await page.mouse.move(t.pt[0] + 40, t.pt[1] + (SHOTS ? 140 : 140));
    for (let i = 0; i < 2; i++) { await page.mouse.wheel({ deltaY: -100 }); await wait(250); }
    return 'the wheel, two notches up';
  }
  if (MODE === 'xr') {
    await q(() => { window.__controller.gamepad.axes = [0, 0, 0, -1]; });
    await ff(page, 0.6);
    await q(() => { window.__controller.gamepad.axes = [0, 0, 0, 0]; });
    await ff(page, 0.2);
    return 'the thumbstick, held up 0.6 s';
  }
  return (await tryPress('mirror:scroll-up')) ? '▲' : 'no ▲';
};
/** ⚑ S429b (G1) — what a scrolled thread leaks, read off the Handset Window's phone: runs of dark (ink) rows shorter than 5 px (a hidden
 *  line's descenders, drawn faint at the list's edge: a whole line of words is 7 px or more), and runs of rows of bare bubble (#e7e7ec at x 40) with no ink in them
 *  longer than 16 px (an empty strip of bubble: inside a bubble the most between words is its 12 px padding) */
const threadLeaks = (y0, y1) => q(({ y0, y1 }) => {
  const cv = window.__graceQueue().mirrorCanvas; if (!cv) return null;
  const s = cv.width / 180, c = cv.getContext('2d'), Y0 = Math.round(y0 * s), Y1 = Math.round(y1 * s);
  const d = c.getImageData(0, Y0, cv.width, Y1 - Y0).data, W = cv.width;
  const lum = (x, y) => { const i = ((y - Y0) * W + x) * 4; return 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; };
  const bub = (x, y) => { const i = ((y - Y0) * W + x) * 4; return Math.abs(d[i] - 0xe7) + Math.abs(d[i + 1] - 0xe7) + Math.abs(d[i + 2] - 0xec) < 10; };
  // any mark darker than the bubble's and the thread's grounds (231, 242): a tail at the list's edge is drawn faint, antialiased
  const inkRow = (y) => { for (let x = Math.round(8 * s); x < Math.round(156 * s); x++) if (lum(x, y) < 205) return true; return false; };
  const frags = [], strips = [], runs = [];
  let run = 0, bare = 0;
  for (let y = Y0; y < Y1; y++) {
    const ink = inkRow(y);
    if (ink) run++; else { if (run > 0) runs.push([y - run, y]); run = 0; }
    if (!ink && bub(Math.round(40 * s), y)) bare++; else { if (bare > 16 * s) strips.push(Math.round(bare / s)); bare = 0; }
  }
  if (run > 0) runs.push([Y1 - run, Y1]);
  if (bare > 16 * s) strips.push(Math.round(bare / s));
  // a short run of ink with nothing within 2 px of it is a fragment (an i's dot or an apostrophe sits a pixel from its own line)
  runs.forEach(([a, b], i) => {
    if (b - a >= 5 * s) return;
    const near = (runs[i - 1] && a - runs[i - 1][1] <= 2 * s) || (runs[i + 1] && runs[i + 1][0] - b <= 2 * s);
    if (!near) frags.push(Math.round(a / s));
  });
  return { frags, strips };
}, { y0, y1 });
const threadCheck = async (what) => {
  await ff(page, 0.3); await wait(400);
  const v = await q(() => { const p = window.__graceQueue().phone; return { tv: p.threadView ?? null, gv: p.groupView, screen: p.screen }; });
  const top = v.tv ? v.tv.vTop : 70, bottom = v.tv ? v.tv.vBottom : 300;
  const band = await phoneBand(top, bottom);
  const leaks = await threadLeaks(top, bottom);
  if (what) check('G1', `${what}: no hidden line's tails, no empty strip of bubble`, !!leaks && leaks.frags.length === 0 && leaks.strips.length === 0,
    leaks ? `ink fragments at y ${leaks.frags.join(', ') || '-'}; bare bubble strips ${leaks.strips.join(', ') || '-'} px` : 'no phone');
  return { ...v, band, leaks };
};

// ═══ 2016, by presses ═══
await playTo(page, view, (s) => s.mode === 'consent', { log: () => {} });
await ff(page, 0.5);
{ const words = await drawnWords();
  check('C8', 'the consent card asks for no voice', !words.some((w) => /when you say/.test(w)), words.find((w) => /Let Lambient/.test(w)) ?? '(no line)'); }
await shot('01', 'consent');
await playTo(page, view, (s) => s.mode === 'board' && s.week, { log: () => {} });
await tryPress('pause-close');
if ((await e3(page)).week) await tryPress('week-begin');
if ((await e3(page)).job) await tryPress('board-back');
await ff(page, 1);
{ const c = await q(() => ({ phone: window.__graceQueue().phone.eveningClock }));
  check('F3', 'the clock\'s hour is padded (phone, lock screen, stamps, taskbar)', /^\d\d:\d\d$/.test(c.phone), c.phone);
  const words = await drawnWords();
  check('F3', 'the taskbar writes the padded hour', words.includes(c.phone) && /^\d\d:/.test(c.phone), words.filter((w) => /^\d{1,2}:\d\d$/.test(w)).join(', '));
  const l = await live();
  check('C5', 'the Handset Window\'s taskbar button is gone', !l.has('mirror-restore'), l.has('mirror-restore') ? 'published' : 'not published'); }
await shot('02', 'clock-taskbar');
await asked('the board', null, ['03', 'lambient-board']);
await dismiss();

// ── Lesson 1 ──
await tryPress('task-0', 'week-begin');
for (let i = 0; i < 40 && (await e3(page)).watch; i++) await ff(page, 1);
for (let i = 0; i < 6 && (await live()).has('apply'); i++) { await tryPress('apply'); await ff(page, 14); }
{ const words = await drawnWords();
  const heading = words.find((w) => /^Lesson 1/.test(w)) ?? '';
  check('C7', 'Lesson 1 says 20 once', !/20/.test(heading), `heading "${heading}"; labels ${words.filter((w) => /0:\d\d/.test(w)).join(' | ')}`); }
await shot('04', 'lesson1');
const GP = await q(async () => (await import('/data/strings/e3_mirror.json')).default.guidePage ?? null);
await asked('Lesson 1\'s page', GP?.testimony ?? '(no page line on this build)', ['05', 'lambient-lesson1']);
await dismiss();
await tryPress('vera-send'); await ff(page, 2); await tryPress('board-back'); await ff(page, 2);

// ── Lesson 2 ──
await playTo(page, view, (s) => s.job === 'places', { log: () => {} });
await ff(page, 1);
await asked('Lesson 2\'s page', GP?.places ?? '(no page line on this build)', ['06', 'lambient-lesson2']);
await dismiss();
await tryPress('places-add'); await ff(page, 1);
{ const r = await q(() => { const G = window.__graceQueue(); const backs = G.rects.filter((x) => x.id === 'board-back').sort((a, b) => b.w * b.h - a.w * a.h); return { back: backs[0] ?? null, W: G.mirrorAvailable ? 676 - 180 - 6 : 676 }; });
  check('C2', 'Lesson 2 finished: Back to Today clear of the Trending panel', !!r.back && r.back.x + r.back.w < r.W * 0.56, r.back ? `x ${Math.round(r.back.x)}–${Math.round(r.back.x + r.back.w)}, y ${Math.round(r.back.y)} (the right column begins at about ${Math.round(r.W * 0.56)})` : 'none'); }
{ // ⚑ S429b (G3) — every place's words whole in its row (none drawn past the row's right edge); (G4) Back to Today's size and gaps
  const r = await q(() => ({ back: window.__graceQueue().rects.filter((x) => x.id === 'board-back').sort((a, b) => b.w * b.h - a.w * a.h)[0] ?? null }));
  const reading = await q(async () => (JSON.stringify((await import('/data/dialog/s3_places.json')).default).match(/"(Reading group[^"]*)"/) ?? [])[1] ?? 'Reading group');
  const at = await q(async () => { window.__drawnAt = []; window.__graceQueue().bump?.(); await new Promise((r) => setTimeout(r, 350)); const d = window.__drawnAt; window.__drawnAt = null; return d; });
  const i0 = at.findIndex((w) => w.s.startsWith('Reading group'));
  const drawnReading = i0 < 0 ? [] : at[i0].s === reading ? [at[i0]] : [at[i0], at[i0 + 1]].filter(Boolean);
  // the row's right edge is the platform's content edge (its window 490 px wide, 18 px in): nothing written past it
  const right = 490 - 18;
  check('G3', 'Lesson 2: "Reading group · Thursdays, the library annexe" whole in its row (wrapped, not cut)',
    drawnReading.map((w) => w.s).join(' ') === reading && drawnReading.every((w) => w.x1 <= right),
    `drawn as ${drawnReading.map((w) => `"${w.s}" (ends at x ${Math.round(w.x1)})`).join(' + ')}; the row ends at x ${right}`);
  const b = r.back;
  check('G4', 'Lesson 2 finished: Back to Today the size of every lesson page\'s (96 × 18), in the top row', !!b && Math.round(b.w) === 96 && Math.round(b.h) === 18, b ? `${Math.round(b.w)} × ${Math.round(b.h)} at y ${Math.round(b.y)}` : 'none');
}
await shot('07', 'lesson2-done');
await tryPress('board-back'); await ff(page, 12);
await bannerCheck('after Lesson 2');
// a finished lesson's page, during the training (Lesson 1, opened again)
if (await tryPress('task-0')) { await ff(page, 0.5); await asked('a finished lesson\'s page', GP?.done ?? '(no page line on this build)', ['07b', 'lambient-finished']); await dismiss(); await tryPress('board-back'); await ff(page, 2); }

// ── Orla's thread (C1) ──
if (await tryPress('mirror:lock-card:Orla', 'mirror:evening-banner')) {
  await ff(page, 1);
  const a = await threadCheck('Orla\'s thread at rest');
  await shot('08', 'orla-rest');
  const how = await scrollUp();
  const b = await threadCheck('Orla\'s thread scrolled up');
  check('C1', `Orla's thread at rest: no blank band`, a.band && a.band.band <= 30, `largest empty band ${a.band?.band} px at y ${a.band?.at}`);
  check('C1', `Orla's thread scrolled (${how}): it moved`, (b.tv?.O ?? 0) !== (a.tv?.O ?? 0) || b.gv?.scrollBack !== a.gv?.scrollBack, `O ${a.tv?.O} → ${b.tv?.O}`);
  check('C1', `Orla's thread scrolled: no blank band`, b.band && b.band.band <= 30, `largest empty band ${b.band?.band} px at y ${b.band?.at}`);
  await shot('09', 'orla-up');
  await tryPress('mirror:scroll-down'); await tryPress('mirror:back'); await tryPress('mirror:back'); await ff(page, 1);
} else check('C1', 'Orla\'s thread', null, 'not reachable here');

// ── Lesson 3 ──
await playTo(page, view, (s) => s.job === 'family', { log: () => {} });
await ff(page, 0.2);
await asked('Lesson 3\'s page', GP?.family ?? '(no page line on this build)', ['10', 'lambient-lesson3']);
await dismiss();
{ const fam = () => q(() => { const f = window.__graceQueue().surfaces.get('family'); return { sent: !!f.lessonSent, on: f.current().id, note: f.note?.line ?? null }; });
  let n = 0; while (!(await fam()).sent && n++ < 300) await ff(page, 0.1);
  const at0 = await fam(); let t = 0;
  while ((await fam()).on !== 'p_annette' && t < 6) { await ff(page, 0.1); t += 0.1; }
  check('C3', 'Lambient answers Maureen, then Annette at once', at0.sent && t < 0.05, `on Annette ${Math.round(t * 10) / 10} s after Lambient's send (screen at the send: ${at0.on})`);
  check('C3', 'it says plainly that Lambient answered', /answered Maureen/.test(at0.note ?? ''), at0.note ?? '(no line)');
  // the still: the moment of the send (on this build)
}
await shot('11', 'lesson3-sent');
await tryPress('family-sel-1'); await tryPress('family-reply-r_grief'); await ff(page, 1);
await asked('Lesson 3 finished (the chain names the step)', null);
await dismiss();
await tryPress('board-back'); await ff(page, 12);
await bannerCheck('after Lesson 3');

// ── the memory page (C4) ──
await playTo(page, view, (s) => !!s.card || s.page === 'record', { log: () => {} });
if ((await e3(page)).card) await tryPress('memory-look');
await ff(page, 0.5);
const closeEdge = () => q(() => { const r = window.__graceQueue().rects.find((x) => x.id === 'memory-close'); return r ? { x: Math.round(r.x), right: Math.round(r.x + r.w) } : null; });
const c1 = await closeEdge();
if (await q(() => ['evening', 'group'].includes(window.__graceQueue().phone.screen))) await threadCheck('Mam\'s thread beside the memory page');
await shot('12', 'memory-published');
await ff(page, 40);
const c2 = await closeEdge();
check('C4', 'the memory page\'s Close stays on the right in both states', !!c1 && !!c2 && c1.right === c2.right && c2.x > 676 * 0.4, `published ${JSON.stringify(c1)} → turned ${JSON.stringify(c2)}`);
await shot('13', 'memory-turned');

// ── row 6: the Notes banner over Mam's thread (F1), the Start menu's foot (F4) ──
await tryPress('memory-close'); await ff(page, 0.5);
await bannerCheck('of her Notes', true);
if (await q(() => ['evening', 'group'].includes(window.__graceQueue().phone.screen))) await threadCheck('Mam\'s thread under the Notes banner');
await shot('14', 'banner-notes');
if (await tryPress('start-menu')) {
  await ff(page, 0.2); await wait(400);
  const f = await q(() => {
    const G = window.__graceQueue(), leave = G.rects.find((r) => r.id === 'sm-leave'), cv = window.__era3Devices().workstation, s = cv.width / 676, c = cv.getContext('2d');
    if (!leave) return null;
    // the band from under the foot's buttons to the taskbar (390 - 28), across the menu's width: every pixel the menu's paper?
    const y0 = Math.ceil(leave.y + leave.h + 3), y1 = 390 - 28, x0 = 6, x1 = 290;
    const paper = c.getImageData(Math.round(20 * s), Math.round((leave.y + leave.h + 2) * s), 1, 1).data;
    const d = c.getImageData(Math.round(x0 * s), Math.round(y0 * s), Math.round((x1 - x0) * s), Math.max(1, Math.round((y1 - y0) * s))).data;
    let off = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - paper[0]) + Math.abs(d[i + 1] - paper[1]) + Math.abs(d[i + 2] - paper[2]) > 24) off++;
    return { band: [y0, y1], off, leaveBottom: Math.round(leave.y + leave.h) };
  });
  check('F4', 'the Start menu\'s foot: nothing of the page shows under it', !!f && f.off === 0, f ? `${f.off} pixels in rows ${f.band[0]}–${f.band[1]} that are not the menu's paper (Leave… ends at ${f.leaveBottom})` : 'no foot on this build');
  await shot('15', 'start-foot');
  await tryPress('start-menu'); await ff(page, 0.3);
}

// ── rows 7–9: her Notes, Nuala, Bea's banner over Nuala's thread (F1) ──
await tryPress('mirror:evening-banner', 'mirror:lock-notice'); await ff(page, 15);
await tryPress('mirror:back'); await ff(page, 4);
await tryPress('mirror:lock-card:Nuala'); await ff(page, 12);
await bannerCheck('from Maiden-to-be (Bea)', true);
if (await q(() => ['evening', 'group'].includes(window.__graceQueue().phone.screen))) await threadCheck('Nuala\'s thread under Bea\'s banner');
await shot('16', 'banner-bea');

// ── rows 10–11: the group (C1) ──
await tryPress('mirror:evening-banner', 'mirror:lock-notice');
await playTo(page, view, (s) => s.phone?.stage === 'read' || s.kitPopin, { log: () => {}, limit: 60 });
if ((await q(() => window.__graceQueue().phone.screenNow ?? window.__graceQueue().phone.screen)) !== 'group') await tryPress('mirror:evening-banner', 'mirror:lock-notice', 'mirror:lock-card:Maiden-to-be');
await ff(page, 0.5);
{ const a = await threadCheck('Bea\'s group at rest');
  await shot('17', 'group-rest');
  const how = await scrollUp();
  const b = await threadCheck('Bea\'s group scrolled up');
  check('C1', 'Bea\'s group at rest: no blank band', a.band && a.band.band <= 30, `largest empty band ${a.band?.band} px at y ${a.band?.at}`);
  check('C1', `Bea's group scrolled (${how}): it moved`, (b.tv?.O ?? 0) !== (a.tv?.O ?? 0) || b.gv?.scrollBack !== a.gv?.scrollBack, `O ${a.tv?.O} → ${b.tv?.O}; scrollBack ${a.gv?.scrollBack} → ${b.gv?.scrollBack}`);
  check('C1', 'Bea\'s group scrolled: no blank band', b.band && b.band.band <= 30, `largest empty band ${b.band?.band} px at y ${b.band?.at}`);
  await shot('18', 'group-up');
  // ▲ by press too (touch's way, on every look-mode), and ▼ back
  const up = await tryPress('mirror:scroll-up'); const c = await threadCheck('Bea\'s group after ▲');
  check('C1', 'Bea\'s group: ▲ by press goes back, no blank band', !!up && c.band && c.band.band <= 30, `pressed ${!!up}; band ${c.band?.band} px; keys ${c.gv?.keys?.join(',')}`);
  if (SHOTS) await shot('19', 'group-up-press');
  const down = await tryPress('mirror:scroll-down'); const d = await threadCheck();
  check('C1', 'Bea\'s group: ▼ back to the newest', !!down && d.gv?.scrollBack === 0, `pressed ${!!down}; scrollBack ${d.gv?.scrollBack}`);
  // repaints: the thread still (no press, no stick) repaints nothing; held, at most the stick's rate
  if (MODE === 'xr') {
    const rate = (held) => q(async (held) => {
      const G = window.__graceQueue(); if (held) window.__controller.gamepad.axes = [0, 0, 0, -1];
      const v0 = G.phoneVersion, t0 = performance.now(); let n = 0, last = v0;
      await new Promise((res) => { const tick = () => { const v = G.phoneVersion; if (v !== last) { n++; last = v; } if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
      window.__controller.gamepad.axes = [0, 0, 0, 0];
      return Math.round(n / ((performance.now() - t0) / 1000) * 10) / 10;
    }, held);
    await tryPress('mirror:scroll-down');
    const still = await rate(false), held = await rate(true);
    result.repaints = { stillPerSecond: still, stickHeldPerSecond: held };
    check('C1', 'the thumbstick steps the thread at ≤ 7 a second; still, it repaints nothing', held <= 8 && still <= 0.5, `phone repaints: still ${still}/s, stick held ${held}/s`);
  }
}

// ── rows 11–12: the kit; Take my story down (C6) ──
await playTo(page, view, (s) => s.kitPopin || s.page === 'kit', { log: () => {}, limit: 80 });
await tryPress('kit-popin-open'); await ff(page, 1);
if (await tryPress('vera-take-down')) {
  await ff(page, 0.5);
  const words = await drawnWords();
  const V = await q(async () => (await import('/data/dialog/s3_vera.json')).default.kit);
  check('C6', 'the take-down page says what happened', words.includes(V.takenDownHeading ?? '\u0000') && !words.includes(V.takeDown), `drawn: ${words.filter((w) => /[Tt]aken? (my story )?down|SisterSignal|copies/.test(w)).join(' | ')}`);
  await shot('20', 'take-down');
} else check('C6', 'the take-down page', false, 'Take my story down not published');
await tryPress('vera-kit-close'); await ff(page, 1);
await bannerCheck('of the review');

result.draws = await q(() => window.__drawCalls ?? null);
const pass = result.checks.filter((c) => c.ok === true).length, fail = result.checks.filter((c) => c.ok === false).length;
result.summary = { pass, fail, na: result.checks.length - pass - fail };
fs.writeFileSync(path.join(OUT, `s429-probe_${MODE}_${BUILD}.json`), JSON.stringify(result, null, 1));
say(`${BUILD} ${MODE}: PASS ${pass} · FAIL ${fail} · n/a ${result.summary.na} · errors ${errors.length}`);
await browser.close();
process.exit(fail ? 1 : 0);
