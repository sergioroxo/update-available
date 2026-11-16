#!/usr/bin/env node
/**
 * ⚑ S396 (UiB job 28 B6; S394, job 27 B7, before it) — THE LAMBY SET, PRESSED THE WAY A VISITOR PRESSES IT, IN THREE
 * LOOK-MODES. What job 28 changed (his 16 Nov): "Play it all" — the tape plays to its end, there is no Part 1 stop; "The
 * person if they want they can get out of it, and it gets paused" — setting the set down (its body, ⏻) or the story moving
 * on pauses it where it is, and ▶ later goes on from that second, on the set and on the era's website; "There is a play
 * button on the screen for a TV that already has a play button, that is unnecessary" — nothing of the player's is drawn
 * or pressable on the glass but the whole-glass play/pause; the state is on the set (the lit ▶ or ❚❚, the deck's display).
 * v6 tapes (S395) carry their bar in the picture: the set draws none, and the burned-in capitals are read from the
 * delivered frames (tools/s396-frame-caps.mjs → output/s396/frame-caps-<tape>.json) through the held set's real size.
 *
 *     node tools/s394-lamby-tv-probe.mjs --port 5201 [--out output/s396-probe] [--mode desktop|xr|phone|all] [--only 1997|2016|2026]
 *                                        [--rate 1]   (a faster tape for a development run only; the report says so)
 *                                        [--webkit-lock] [--strict-autoplay] [--no-prime]   (the MUTE fix, below)
 *
 * Per room: the era by its review route (1997: the short door, Log in, the desktop; 2016 `?era=3` at the board; 2026
 * `?era=4`), the eye turned AWAY from the seat's rest bearing first (the computer and the phone 100° round; the headset's head
 * turned 140°, i.e. behind), the moment ARMED through `__teachingTv.arm` (a review aid: the walk proves each beat is reached
 * by clicking; this proves the set), then:
 *  · THE MOMENT: Lamby's line on the card IN VIEW wherever the eye is; answered three ways — the computer presses its yes,
 *    the headset closes it with × (the set still comes), the phone lets it time out; the set comes (rest → lifting → held),
 *    whole in view, face on; the tape plays FROM ITS START with its sound and TO ITS END (the last second, held); NO TURN;
 *  · SEEN AND READ: the picture's height (CSS px, or degrees in the headset); v6: the glass is all picture, the set's bar is
 *    empty, and the tape's own capitals (subtitles, the [n] line) in this mode against the floors; v4/v5: the live bar's
 *    capitals; the glass's uploads per second playing, none paused, stopped or ended;
 *  · NOTHING ON THE GLASS: in every state (leader, playing, paused, ended, stopped) the glass publishes ONE control, the
 *    whole glass (play or pause, or the sound while it plays muted); paused or ended its pixels are the tape's frame and
 *    nothing else (compared with the video drawn the same way); stopped it is one blank colour;
 *  · THE STATE ON THE SET: the deck's mode for each state, and its decal's pixels — ▶'s lamp green while it plays, ❚❚'s amber
 *    while it is paused, the display lit with its word;
 *  · THE SET IN THE HAND, each press a real one at its place (a mouse press; the emulated headset's controller ray and
 *    select; a touch tap): ▶ at the end plays from the start, the glass pauses and plays, ▶ / ❚❚ keys, ⏭ ⏮ (2016: a disc's
 *    trailer refuses them, if the tape has one), ⏏ stops (the place kept), ▶ resumes from that second;
 *  · PUT DOWN AND RESUME: while it plays, its body puts it back paused at the second it was at; a press on it at rest brings
 *    it, still paused; ▶ goes on from that same second; ⏻ does the same; the story's voice does the same;
 *  · LAMBY'S LATER OFFER brings the set (the guide's own act, `open:tv`), not playing;
 *  · THE CLOSE: the era's website plays the ROOM copy from the set's place; its HTML carries the tape's text (v6: every
 *    [n] line, every reference, the long break, captions off by default; v5: the margin's sources, the long break);
 *  · THE UPDATE: armed while it plays in the hand: it stops (the place kept) and goes back;
 *  · (headset) DRAW CALLS at the seat in twelve yaws × three pitches, and with the set held (≤ 75).
 *  · ⚑ S396 THE MUTE FIX: WebKit (every Apple browser; on an iPhone the whole piece) gives an element its sound only from a
 *    play() inside a press, and the moment's play() runs from the frame loop. The visitor's first press in the era primes
 *    the era's tape (play → pause, unmuted, nothing heard). Checked: the press that primes plays nothing (the set stays at
 *    its leader, its element paused); the tape was primed by a real press (inside its user activation) before the moment
 *    played it; the moment's play started unmuted. `--strict-autoplay` runs Chrome with `--autoplay-policy=user-gesture-
 *    required`; `--no-prime` turns the priming off (review aid) and REPORTS (INFO, never failed) whether the moment's play
 *    was refused its sound — ⚑ on 16 Nov headless Chromium did NOT refuse it even ~6 s after the last press, so WebKit's
 *    refusal is not reproducible here: these checks prove the fix's mechanics, not its effect in Safari. The phone, which
 *    leaves Lamby's call to time out, first taps the card's body (a real press that does nothing else), as a visitor's
 *    earlier presses in the era would. `--webkit-lock` (computer and phone: real presses) EMULATES WebKit's rule in the page
 *    before it loads: an unmuted play() is refused (NotAllowedError) unless the element has been play()ed inside a trusted
 *    press's own handler (`window.event` a trusted pointer/touch/mouse/key event) — Chromium's 5 s activation window does
 *    not count. Under it the fix must still start the moment with its sound, and `--no-prime` must show the refusal and the
 *    fallback (MUTE, ▶ gives the sound). Still an emulation, not a Safari device.
 * Writes report-<mode>.json and photographs; exit 1 on any failed check. Needs a Vite dev server on --port.
 * ⚑ Chrome runs with `--disable-audio-output` (see s392: this machine's audio device stopped opening for headless Chrome).
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'output/s396-probe'));
const RATE = Number(flag('rate', 1));
const STRICT = argv.includes('--strict-autoplay'), NO_PRIME = argv.includes('--no-prime'), WEBKIT_LOCK = argv.includes('--webkit-lock');
const MODE = flag('mode', 'all');
const ONLY = flag('only', '');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const TAPES = JSON.parse(fs.readFileSync('data/room/teaching_tapes.json', 'utf8')).tapes;
const TVJ = JSON.parse(fs.readFileSync('data/room/teaching_tvs.json', 'utf8'));
const WORDS = JSON.parse(fs.readFileSync('data/strings/teaching_tv.json', 'utf8'));
/** the delivered frames' capitals (tools/s396-frame-caps.mjs), per v6 tape */
const CAPS = Object.fromEntries(['1997', '2016', '2026'].map((t) => { try { return [t, JSON.parse(fs.readFileSync(`output/s396/frame-caps-${t}.json`, 'utf8'))[0]]; } catch { return [t, null]; } }));
const FLOORS = { xr: 1.0, desktop: 14, phone: 12 };
const ROOMS = [
  { tape: '1997', era: 1, guide: 'e1', seat: { x: 0, y: 1.16, z: 0.7, pitch: 0, yaw: 0 }, update: 'u2', year: '1997' },
  { tape: '2016', era: 3, guide: 'e3', seat: { x: -4.4, y: 1.16, z: 0.7, pitch: -8, yaw: 93 }, update: 'u4', year: '2016' },
  { tape: '2026', era: 4, guide: 'e4', seat: { x: 4.6, y: 1.16, z: 0.7, pitch: -8, yaw: 270 }, update: 'close', year: '2026' }
];
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', `--autoplay-policy=${STRICT ? 'user-gesture-required' : 'no-user-gesture-required'}`, '--disable-audio-output'] });
const checks = [];
const measures = {};
const check = (mode, tape, name, ok, extra = '') => { checks.push({ mode, tape, name, ok: !!ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  [${mode} ${tape}] ${name}${extra ? '  ' + extra : ''}`); };

async function room(r, mode) {
  const xr = mode === 'xr', phone = mode === 'phone';
  const VW = phone ? 844 : 1280, VH = phone ? 390 : 720;
  const page = await browser.newPage();
  if (phone) await page.emulate({ userAgent: IPHONE_UA, viewport: { width: VW, height: VH, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: true } });
  if (WEBKIT_LOCK) await page.evaluateOnNewDocument(() => {
    const unlocked = new WeakSet(), play = HTMLMediaElement.prototype.play;
    const PRESS = ['pointerup', 'pointerdown', 'click', 'mouseup', 'mousedown', 'touchend', 'touchstart', 'keydown', 'keyup'];
    window.__webkitLock = { refused: 0 };
    HTMLMediaElement.prototype.play = function () {
      const e = window.event;
      if (e && e.isTrusted && PRESS.includes(e.type)) unlocked.add(this);
      if (!this.muted && !unlocked.has(this)) { window.__webkitLock.refused++; return Promise.reject(new DOMException('emulated WebKit gesture lock', 'NotAllowedError')); }
      return play.call(this);
    };
  });
  else await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  let n = 0;
  const shot = async (label) => { await page.screenshot({ path: path.join(OUT, `${mode}-${r.tape}-${String(++n).padStart(2, '0')}-${label}.png`) }); };
  const C = (name, ok, extra) => check(mode, r.tape, name, ok, extra);
  const M = measures[`${mode}-${r.tape}`] = {};
  const q = r.era === 1 ? '?reinterp=1&kiosk=0&debug=1&home=0' : `?reinterp=1&era=${r.era}&debug=1&descent=0&kiosk=0`;
  await page.goto(`http://localhost:${PORT}/${q}`, { waitUntil: 'load', timeout: 180000 });
  if (r.era === 1) {
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 60000 }).catch(() => {});
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
  }
  await page.waitForFunction(() => window.__app && window.__teachingTv && window.__camPose && window.__os, { timeout: 180000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic { display: none !important; }' });
  if (NO_PRIME) await page.evaluate(() => window.__teachingTv.noPrime(true));
  await wait(5000);
  for (let i = 0; i < 60; i++) { const p = await page.evaluate(() => window.__camPose()); if (!p.driven && !p.descent) break; await wait(1000); }
  if (r.era === 1) await page.evaluate(() => window.__os.debugJump('desktop'));
  if (r.era === 3) await page.evaluate(() => { const g = window.__graceQueue(); g.debugBeat('board'); g.seenTask = true; g.wotdSaid = true; g.waitSaid = true; g.lambLines = null; g.lambPriority = false; g.bump(); });
  if (xr) {
    await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      window.__controller = src; app.xr.input.fire('add', src);
    });
    await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
    await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
    await wait(1500);
    await page.evaluate(() => { const a = window.__app; a.on('update', () => { const d = a.root.findByName('xr-debug'); if (d) d.enabled = false; }); });
  }
  await wait(1500);
  const tvd = () => page.evaluate((t) => { const d = window.__teachingTv(); return { ...d.tvs.find((x) => x.tape === t), moment: d.moments[t], call: d.call, holding: d.holding }; }, r.tape);
  const draws = () => page.evaluate(async () => { const a = []; for (let i = 0; i < 12; i++) { await new Promise(requestAnimationFrame); a.push(window.__drawCalls); } return Math.max(...a); });
  /** the rig and the eye's facing: yaw and pitch from the FORWARD VECTOR (never getEulerAngles().y: −90…+90 only) */
  const facing = () => page.evaluate((xr) => {
    const app = window.__app, rig = app.root.findByName('camera-rig'), head = app.root.findByName('camera');
    const yp = (f) => ({ yaw: +(Math.atan2(-f.x, -f.z) * 180 / Math.PI).toFixed(2), pitch: +(Math.asin(Math.max(-1, Math.min(1, f.y))) * 180 / Math.PI).toFixed(2) });
    const p = window.__camPose();
    return { pose: { yaw: +p.yaw.toFixed(2), pitch: +p.pitch.toFixed(2) }, rig: yp(rig.forward), head: yp(head.forward), xr };
  }, xr);
  /** a world point on the screen (the head's camera): where, whether in view, its angle from the gaze */
  const view = (pts) => page.evaluate(({ pts, VW, VH, xr }) => {
    const app = window.__app, V = app.root.getPosition().constructor;
    let cam = null; app.root.forEach((e) => { if (e.camera && e.enabled) cam = e; });
    const phys = (p) => (xr && window.__xrComfort?.physicalPoint ? window.__xrComfort.physicalPoint(p.clone()) : p);
    const eye = cam.getPosition(), fwd = cam.forward;
    return pts.map((w) => {
      const p = phys(new V(w[0], w[1], w[2])), s = cam.camera.worldToScreen(p), d = p.clone().sub(eye);
      const ang = Math.acos(Math.max(-1, Math.min(1, d.clone().normalize().dot(fwd)))) * 180 / Math.PI;
      return { x: s.x, y: s.y, z: s.z, inView: s.z > 0 && s.x >= 0 && s.y >= 0 && s.x <= VW && s.y <= VH, ang, dist: d.length() };
    });
  }, { pts, VW, VH, xr });
  /** the angle (degrees) between two world points seen from the eye */
  const angle = (a, b) => page.evaluate(({ a, b, xr }) => {
    const app = window.__app, V = app.root.getPosition().constructor;
    let cam = null; app.root.forEach((e) => { if (e.camera && e.enabled) cam = e; });
    const phys = (p) => (xr && window.__xrComfort?.physicalPoint ? window.__xrComfort.physicalPoint(p.clone()) : p);
    const e = cam.getPosition(), da = phys(new V(...a)).sub(e).normalize(), db = phys(new V(...b)).sub(e).normalize();
    return Math.acos(Math.max(-1, Math.min(1, da.dot(db)))) * 180 / Math.PI;
  }, { a, b, xr });
  /** press a world point the way the mode presses (a real mouse press, a touch tap, the controller's select) */
  const pressWorld = async (w, settle = 900) => {
    if (xr) {
      await page.evaluate((p) => {
        const app = window.__app, head = app.root.findByName('camera'), c = window.__xrComfort;
        const origin = head.getPosition().clone().add(head.right.clone().mulScalar(0.12)).add(head.up.clone().mulScalar(-0.25));
        const target = c.physicalPoint(origin.clone().set(p[0], p[1], p[2]));
        window.__controller.getOrigin = () => origin;
        window.__controller.getDirection = () => target.clone().sub(origin).normalize();
      }, w);
      await wait(200);
      await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
      await wait(settle);
      return true;
    }
    const [v] = await view([w]);
    if (!v.inView) return false;
    if (phone) await page.touchscreen.tap(v.x, v.y);
    else { await page.mouse.move(v.x, v.y); await wait(60); await page.mouse.down(); await wait(70); await page.mouse.up(); }
    await wait(settle);
    return true;
  };
  const key = async (id, settle) => { const d = await tvd(); const k = d.targets.keys.find((x) => x.id === id); const ok = await pressWorld(k.at, settle); if (!ok) C(`the ${id} key is on screen to press`, false, ''); return ok; };
  /** turn the eye (the computer's free camera; the headset's head), relative to the seat's yaw */
  const turn = async (dyaw, pitch = 0) => {
    if (xr) await page.evaluate((dy, p) => { const head = window.__app.root.findByName('camera'); head.setLocalEulerAngles(p, dy, 0); }, dyaw, pitch);
    else await page.evaluate((s, dy, p) => window.__camFree(s.x, s.y, s.z, p, s.yaw + dy), r.seat, dyaw, pitch);
    await wait(500);
  };
  /** the picture and the bar, read from the eye: px on a screen, degrees in the headset */
  const readSet = async () => {
    const d = await tvd(), tg = d.targets;
    const [top, bot, ...keys] = await view([tg.picTop, tg.picBottom, ...tg.keys.map((k) => k.at)]);
    const picPx = Math.abs(bot.y - top.y), picDeg = await angle(tg.picTop, tg.picBottom);
    // ⚑ S394 fix — the picture is the glass above the bar (720 − the bar's height canvas px): the bar grows in a look-mode that needs it
    const picCanvas = d.barInPicture ? 720 : 720 - (d.bar.barH || d.glass.barPx || 180), perCanvas = picPx / picCanvas, perDeg = picDeg / picCanvas;
    return { picPx: +picPx.toFixed(1), picDeg: +picDeg.toFixed(2), picInView: top.inView && bot.inView, keysInView: keys.every((k) => k.inView),
      capCaptionPx: +(d.bar.capCaption * perCanvas).toFixed(1), capMarginPx: +(d.bar.capMargin * perCanvas).toFixed(1),
      capCaptionDeg: +(d.bar.capCaption * perDeg).toFixed(2), capMarginDeg: +(d.bar.capMargin * perDeg).toFixed(2), bar: d.bar, scale: +d.heldScale.toFixed(3), dist: +d.heldDist.toFixed(3),
      // v6: a frame px of 1080 (the glass's 720 canvas px are the frame's 1080) in this mode's unit
      perFrame: +((xr ? picDeg : picPx) / 1080).toFixed(4), barInPicture: d.barInPicture };
  };

  /** ⚑ S396 — the glass: ONE control (the whole glass); paused or ended its pixels are the tape's frame only; stopped one colour */
  const glass = (label, want) => page.evaluate(({ t, label, want }) => {
    const tv = window.__teachingTv.inst(t), d = tv.debug(), cv = window.__teachingTv.canvases()[`tv${t}`];
    const hits = d.hits, one = hits.length === 1 && hits[0].x === 0 && hits[0].y === 0 && hits[0].w === 960 && hits[0].h === 720;
    const out = { label, state: d.state, hits: hits.map((h) => h.id), oneWhole: one, hitId: hits[0]?.id ?? null };
    // (playing, or the leader: the controls only — the picture moves under a comparison)
    if (want === 'none') { out.ok = one; return out; }
    const picH = 720 - (d.glass.barPx || 0);
    const a = cv.getContext('2d').getImageData(0, 0, 960, picH).data;
    if (want === 'blank') {
      let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - a[0]) + Math.abs(a[i + 1] - a[1]) + Math.abs(a[i + 2] - a[2]) > 6) n++;
      out.offPixels = n; out.ok = one && n === 0; return out;
    }
    const v = tv.video;
    if (!v || !v.videoWidth) { out.ok = false; out.why = 'no video frame'; return out; }
    const off = document.createElement('canvas'); off.width = 960; off.height = picH;
    const c = off.getContext('2d'); c.fillStyle = '#000000'; c.fillRect(0, 0, 960, picH);
    const s = Math.min(960 / v.videoWidth, picH / v.videoHeight), w = Math.round(v.videoWidth * s), h = Math.round(v.videoHeight * s);
    const x0 = Math.round((960 - w) / 2), y0 = Math.round((picH - h) / 2);
    c.drawImage(v, x0, y0, w, h);
    const b = c.getImageData(0, 0, 960, picH).data;
    let diff = 0, n = 0, px = 0;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const i = (y * 960 + x) * 4, e = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
      diff += e; px++; if (e > 60) n++;
    }
    out.meanDiff = +(diff / px / 3).toFixed(2); out.offPixels = n; out.offShare = +(n / px).toFixed(5); out.picH = picH;
    out.ok = one && out.offShare < 0.002;
    return out;
  }, { t: r.tape, label, want });
  const G = async (label, want, idWant) => {
    const g = await glass(label, want);
    C(`nothing on the glass (${label}): one control, the whole glass${idWant ? ` (${idWant})` : ''}${want === 'blank' ? '; one blank colour' : want === 'frame' ? '; its pixels the tape\'s frame only' : ''}`,
      g.ok && (!idWant || g.hitId === idWant), JSON.stringify(g));
    return g;
  };
  /** ⚑ S396 — the state on the set: the deck's mode, and its decal's pixels (▶'s lamp, ❚❚'s lamp, the display's words) */
  const deck = async (want) => {
    const k = await page.evaluate((t) => {
      const D = window.__teachingTv(), d = D.tvs.find((x) => x.tape === t), P = D.deckPixels, cv = window.__teachingTv.canvases()[`set${t}`];
      const cx = cv.getContext('2d');
      const px = (r) => { const q = cx.getImageData(r.x + r.w / 2, r.y + r.h / 2, 1, 1).data; return [q[0], q[1], q[2]]; };
      const near = (q, hex) => { const n = parseInt(hex.slice(1), 16); return Math.abs(q[0] - (n >> 16 & 255)) + Math.abs(q[1] - (n >> 8 & 255)) + Math.abs(q[2] - (n & 255)) < 30; };
      const R = P.display, img = cx.getImageData(R.x, R.y, R.w, R.h).data;
      let ink = 0; for (let i = 0; i < img.length; i += 4) if (img[i] + img[i + 1] + img[i + 2] > 300) ink++;
      const play = px(P.lamps.play), pause = px(P.lamps.pause);
      return { deck: d.deck, playLampGreen: near(play, '#3AE07A'), pauseLampAmber: near(pause, '#EFA13F'), displayInk: ink, play, pause };
    }, r.tape);
    const mode = k.deck.mode;
    const lamps = (mode === 'play' || mode === 'load') ? k.playLampGreen && !k.pauseLampAmber : mode === 'pause' ? k.pauseLampAmber && !k.playLampGreen : !k.playLampGreen && !k.pauseLampAmber;
    C(`the state on the set: the deck reads ${want.toUpperCase()} (${mode} "${k.deck.word}" ${k.deck.time}), its lamps and display painted`, mode === want && lamps && k.displayInk > 150,
      JSON.stringify({ lampsOk: lamps, displayInk: k.displayInk, play: k.play, pause: k.pause }));
    return k;
  };
  const uploadsIn = async (ms) => { const d0 = (await tvd()).draws; await wait(ms); return (await tvd()).draws - d0; };
  const rate = async () => { if (RATE !== 1) await page.evaluate(({ t, r }) => { const v = window.__teachingTv.inst(t)?.video; if (v) v.playbackRate = r; }, { t: r.tape, r: RATE }); };
  /** read the tape's second now (the element's own clock) */
  const tNow = async () => (await tvd()).t;

  try {
    const T = TAPES[r.tape];
    const v6 = T.version === 'v6';
    if (RATE !== 1) M.rate = RATE;
    if (xr) {
      // ── the headset's draw calls, at the seat in every look: with the set, and the same look without it ──
      let worst = 0, at = '', share = 0, own = [];
      for (const pitch of [-20, 0, 20]) for (let y = 0; y < 360; y += 30) {
        await page.evaluate((dy, p) => { window.__app.root.findByName('camera').setLocalEulerAngles(p, dy, 0); }, y, pitch); await wait(150);
        const withSet = await draws();
        await page.evaluate((t) => { window.__app.root.findByName(`lamby-set-${t}`).enabled = false; }, r.tape); await wait(80);
        const without = await draws();
        await page.evaluate((t) => { window.__app.root.findByName(`lamby-set-${t}`).enabled = true; }, r.tape);
        share = Math.max(share, withSet - without);
        if (withSet > worst) { worst = withSet; at = `head yaw ${y}° pitch ${pitch}°`; }
        if (withSet > 75) own.push({ look: `${y}/${pitch}`, withSet, without });
      }
      M.drawsSeat = { worst, at, setShare: share, over75: own };
      C('the headset: the set adds ≤ 3 draw calls in any look from the seat (12 yaws × 3 pitches)', share <= 3, `+${share}`);
      C('the headset: ≤ 75 draw calls in every look, or already over without the set (the room\'s own, pre-existing)', own.every((o) => o.without > 75), `worst ${worst} at ${at}; over 75: ${JSON.stringify(own)}`);
    }
    // ── 1 · the moment: looking AWAY, Lamby's line in view, the set comes, the tape plays TO ITS END ─────────
    const away = xr ? 140 : 100;
    await turn(away, 0);
    const f0 = await facing();
    await shot('looking-away');
    await page.evaluate((t) => window.__teachingTv.arm(t), r.tape);
    const t0 = Date.now(); const stages = {}; let callChecked = false, firstT = null, bringChecked = false, readChecked = false, sound = null, leaderChecked = false, lastT = 0;
    const limit = (T.duration / RATE + 120) * 1000;
    while (Date.now() - t0 < limit) {
      const d = await tvd(); const s = d.moment.stage;
      if (!stages[s]) stages[s] = +((Date.now() - t0) / 1000).toFixed(1);
      if (s === 'call' && d.state === 'leader' && !leaderChecked) { leaderChecked = true; await G('the leader', 'none', 'tv-play'); }
      if (s === 'call' && d.call.shown && !callChecked) {
        callChecked = true;
        M.call = d.call.text;
        const cw = d.call.cw, ch = d.call.ch;
        const corners = await page.evaluate((name) => {
          const e = window.__app.root.findByName(name), m = e.getWorldTransform().data;
          const at = (u, v) => [m[12] + u * m[0] + v * m[8], m[13] + u * m[1] + v * m[9], m[14] + u * m[2] + v * m[10]];
          return [at(0, 0), at(-0.5, -0.5), at(0.5, -0.5), at(-0.5, 0.5), at(0.5, 0.5)];
        }, d.call.entity);
        const vs = await view(corners);
        M.callView = { centreAng: +vs[0].ang.toFixed(1), dist: +vs[0].dist.toFixed(2), corners: vs.slice(1).map((v) => [Math.round(v.x), Math.round(v.y)]) };
        C('Lamby\'s line appears IN VIEW while the eye is turned away (the whole card on screen)', vs.every((v) => v.inView), JSON.stringify(M.callView));
        if (xr) C('in the headset the card is in front of the gaze (≤ 30°), never behind', vs[0].ang <= 30 && vs[0].z > 0, `${vs[0].ang.toFixed(1)}°`);
        C('its words are the era\'s call', d.call.text === WORDS.lamby.call[r.guide], d.call.text);
        await shot('lamby-line-in-view');
        await wait(1200);
        if (mode === 'desktop') {
          const yes = d.call.hits.find((h) => h.id === 'lg-take');
          const w = await page.evaluate(({ name, x, y, cw, ch }) => { const e = window.__app.root.findByName(name), m = e.getWorldTransform().data; const u = x / cw - 0.5, v = y / ch - 0.5; return [m[12] + u * m[0] + v * m[8], m[13] + u * m[1] + v * m[9], m[14] + u * m[2] + v * m[10]]; }, { name: d.call.entity, x: yes.x + yes.w / 2, y: yes.y + yes.h / 2, cw, ch });
          await pressWorld(w, 400);
          M.callAnswer = 'Bring it here (pressed)';
        } else if (xr) {
          const x = d.call.hits.find((h) => h.id === 'lg-x');
          const w = await page.evaluate(({ name, x, y, cw, ch }) => { const e = window.__app.root.findByName(name), m = e.getWorldTransform().data; const u = x / cw - 0.5, v = y / ch - 0.5; return [m[12] + u * m[0] + v * m[8], m[13] + u * m[1] + v * m[9], m[14] + u * m[2] + v * m[10]]; }, { name: d.call.entity, x: x.x + x.w / 2, y: x.y + x.h / 2, cw, ch });
          await pressWorld(w, 400);
          M.callAnswer = '× (closed: the set still comes)';
        } else {
          // the phone leaves the call to its time; first a real tap on the card's body (it takes the press and does nothing),
          //   as the visitor's earlier presses in the era would — the press that primes the tape (the MUTE fix)
          const w = await page.evaluate(({ name }) => { const e = window.__app.root.findByName(name), m = e.getWorldTransform().data; const u = 0.3, v = -0.3; return [m[12] + u * m[0] + v * m[8], m[13] + u * m[1] + v * m[9], m[14] + u * m[2] + v * m[10]]; }, { name: d.call.entity });
          await pressWorld(w, 300);
          M.callAnswer = 'left to its time (its body tapped once)';
        }
        // the press primed the tape (the MUTE fix): nothing plays from it — the set is still at its leader, its element paused
        { await wait(300); const dp = await tvd();
          if (!NO_PRIME) C('the press that primes the tape plays nothing: the set is still at its leader, its element paused, the deck at TAPE', dp.state === 'leader' && dp.paused === true && dp.deck.mode === 'ready', JSON.stringify({ state: dp.state, paused: dp.paused, deck: dp.deck, primed: dp.primed })); }
      }
      if ((s === 'bring' || s === 'play') && !bringChecked) {
        const dd = await tvd();
        if (dd.pose === 'held') {
          bringChecked = true;
          const rs = await readSet();
          M.held = rs;
          C('the set comes to the visitor: held before the eye, the picture whole in view', rs.picInView, JSON.stringify({ picPx: rs.picPx, picDeg: rs.picDeg }));
          C('held, its keys are in view (pressable)', rs.keysInView);
          if (xr) C(v6 ? 'in the headset the glass (all picture) is 25–40° tall' : 'in the headset the picture is 25–30° tall', v6 ? rs.picDeg >= 25 && rs.picDeg <= 40 : rs.picDeg >= 25 && rs.picDeg <= 30.5, `${rs.picDeg}° at ${rs.dist} m, ×${rs.scale}`);
          else C('on a screen the set fills most of the view (the picture ≥ 45% of the height)', rs.picPx >= VH * 0.45, `${rs.picPx} px of ${VH}`);
          await shot('set-brought');
        }
      }
      if (s === 'play') await rate();
      if (s === 'play' && firstT === null && d.t !== null && d.t > 0) firstT = d.t;
      if (s === 'play' && d.t !== null) lastT = Math.max(lastT, d.t);
      if (s === 'play' && !readChecked && d.t > 8 && d.state === 'playing' && (v6 || (d.bar.capCaption > 0 && d.bar.capMargin > 0))) {
        const rs = await readSet();
        readChecked = true; M.read = rs;
        sound = { paused: d.paused, muted: d.muted };
        await shot('playing');
        if (v6) {
          C('v6: the glass is all picture and the set draws no bar (nothing over the tape)', rs.picInView && d.glass.picFrac === 1 && d.glass.barPx === 0 && !d.bar.caption && !d.bar.margin, JSON.stringify({ picFrac: d.glass.picFrac, barPx: d.glass.barPx }));
          const cp = CAPS[r.tape];
          if (!cp) C('v6: the delivered frames were measured (output/s396/frame-caps-<tape>.json)', false, 'run tools/s396-frame-caps.mjs');
          else {
            const unit = xr ? '°' : ' px', floor = FLOORS[mode], k = rs.perFrame;
            const sub = cp.subtitles ? +(cp.subtitles.cap1080[0] * k).toFixed(2) : null, n = cp.n ? +(cp.n.cap1080[0] * k).toFixed(2) : null;
            M.tapeCaps = { perFrame: k, subtitlesMin: sub, nMin: n, unit: unit.trim() };
            C(`v6: the tape's subtitles, held, at ≥ ${floor}${unit} (their smallest capitals ${cp.subtitles?.cap1080[0]} px of 1080)`, sub !== null && sub >= floor - 0.02, `${sub}${unit}`);
            if (phone) C(`v6: the tape's [n] line on the phone (accepted under the 12 px floor, the orchestrator's 16 Nov call; printed in full on the era site) — reported`, n !== null, `${n} px`);
            else C(`v6: the tape's [n] line, held, at ≥ ${floor}${unit} (its smallest capitals ${cp.n?.cap1080[0]} px of 1080)`, n !== null && n >= floor - 0.02, `${n}${unit}`);
          }
        } else {
          if (xr) C('the bar: capitals ≥ 1.0° in the headset (caption and margin)', rs.capCaptionDeg >= 1.0 && rs.capMarginDeg >= 0.995, `caption ${rs.capCaptionDeg}° margin ${rs.capMarginDeg}°`);
          else C(`the bar: capitals ≥ ${phone ? 12 : 14} px on the ${phone ? 'phone' : 'computer'} (caption and margin)`,
            rs.capCaptionPx >= (phone ? 12 : 14) - 0.15 && rs.capMarginPx >= (phone ? 12 : 14) - 0.15, `caption ${rs.capCaptionPx} px margin ${rs.capMarginPx} px`);
        }
        const pre = await tvd();
        await G('playing', 'none', pre.needsSound ? 'tv-sound' : 'tv-pause');
        const dk = await deck('play');
        if (pre.needsSound) {
          // the fallback (a browser that refused the moment its sound): the deck reads MUTE; ▶ (a press, a gesture) gives it
          C('the fallback: playing without its sound, the deck reads MUTE', dk.deck.word === WORDS.deck.mute, JSON.stringify(dk.deck));
          await key('play', 900);
          const e = await tvd();
          C('the fallback: ▶ gives the sound (the press is the gesture), and it plays on', e.state === 'playing' && e.muted === false && !e.needsSound, JSON.stringify({ state: e.state, muted: e.muted, needsSound: e.needsSound }));
        }
        const up = await uploadsIn(3000) / 3;
        M.uploadsPlaying = +up.toFixed(1);
        C('while it plays the glass is redrawn about once per frame of the tape (≤ 31 a second)', up > 5 && up <= 31 * RATE, `${M.uploadsPlaying}/s`);
      }
      if (s === 'after' && !stages.afterShot) {
        stages.afterShot = 1;
        await shot('played-to-the-end');
        C('THE MOMENT PLAYS IT ALL: the tape played to its end, the set still held', d.state === 'ended' && Math.abs(d.t - T.duration) < 0.6 && d.held, `${d.state} t ${d.t?.toFixed(2)} of ${T.duration} held ${d.held}`);
        C('…with no stop on the way (its clock went past every former Part 1 end, and past 90% of the tape, while it played)', lastT >= T.duration * 0.9, `last t seen while playing ${lastT.toFixed(1)}`);
        await G('ended', 'frame', 'tv-play');
        await deck('end');
      }
      if (s === 'done') break;
      await wait(400);
    }
    const dEnd = await tvd();
    const f1 = await facing();
    M.moment = { stages, seconds: +dEnd.moment.seconds.toFixed(1), callSeconds: +dEnd.moment.callSeconds.toFixed(1), firstT, answer: M.callAnswer, duration: T.duration };
    C('the moment ran: call → bring → play from the start → to the end → the floor free', dEnd.moment.stage === 'done' && stages.call !== undefined && stages.bring !== undefined && stages.play !== undefined && stages.after !== undefined, JSON.stringify(stages));
    C('the tape began at its start (the label)', firstT !== null && firstT < 3, `first t ${firstT}`);
    M.prime = { primed: dEnd.primed, playStart: dEnd.playStart, strict: STRICT, noPrime: NO_PRIME };
    if (NO_PRIME) {
      M.controlRefused = !!(dEnd.playStart && dEnd.playStart.muted && dEnd.playStart.needsSound);
      console.log(`INFO  [${mode} ${r.tape}] (no priming, control) the moment's own play was ${M.controlRefused ? 'REFUSED its sound (muted, the deck at MUTE)' : 'NOT refused: it started with its sound (this browser does not lock it)'}  ${JSON.stringify(M.prime)}`);
    } else {
      C('THE MUTE FIX: the tape was primed by a real press before the moment played it' + (xr ? '' : ' (inside the press\'s user activation)'),
        !!dEnd.primed && !!dEnd.playStart && dEnd.primed.at < dEnd.playStart.at && (xr || dEnd.primed.active === true), JSON.stringify(M.prime));
      C('THE MUTE FIX: the moment\'s own play() started unmuted' + (STRICT ? ' (under Chromium\'s per-element gesture lock)' : ''), !!dEnd.playStart && dEnd.playStart.muted === false && !dEnd.playStart.needsSound, JSON.stringify(dEnd.playStart));
      C('it played with its sound (not paused, not muted)', sound && sound.paused === false && sound.muted === false, JSON.stringify(sound));
    }
    C('NO TURN: the view\'s yaw and pitch are unchanged by the moment', Math.abs(f1.head.yaw - f0.head.yaw) < 0.5 && Math.abs(f1.head.pitch - f0.head.pitch) < 0.5 && Math.abs(f1.pose.yaw - f0.pose.yaw) < 0.5, `${JSON.stringify(f0)} → ${JSON.stringify(f1)}`);
    if (xr) C('NO TURN: the headset rig\'s yaw is unchanged by the moment', Math.abs(f1.rig.yaw - f0.rig.yaw) < 0.5, `${f0.rig.yaw} → ${f1.rig.yaw}`);
    C('after the end the set waits in the hand', dEnd.held && dEnd.state === 'ended');
    { const u = await uploadsIn(2500); M.uploadsEnded = u; C('ended, the glass uploads nothing', u === 0, `${u} in 2.5 s`); }
    if (xr) {
      // ⚑ S394 fix — the frame's plate never over a held set: the one-time table offer forced due while it is held (and a
      //   notice), then the set put down — the offer comes then
      const OFFER = JSON.parse(fs.readFileSync('data/strings/gameMenu.json', 'utf8')).xrDeskOffer;
      await page.evaluate((t) => { window.__xrLayer.review({ offer: true }); window.__xrFrame.notice(t, 9); }, 'A frame notice, sent while the set is held');
      await wait(1600);
      const over = await page.evaluate((keyRow) => {
        const app = window.__app, c = window.__xrComfort, V = app.root.getPosition().constructor;
        let cam = null; app.root.forEach((e) => { if (e.camera && e.enabled) cam = e; });
        const box = (pts) => { const s = pts.map((p) => cam.camera.worldToScreen(p)); return { x0: Math.min(...s.map((q) => q.x)), x1: Math.max(...s.map((q) => q.x)), y0: Math.min(...s.map((q) => q.y)), y1: Math.max(...s.map((q) => q.y)) }; };
        const row = box(keyRow.map((p) => c.physicalPoint(new V(p[0], p[1], p[2]))));
        const shown = window.__xrFrame.hintShown();
        const plate = shown ? box(shown.corners.map((p) => new V(p[0], p[1], p[2]))) : null;
        const hit = !!plate && plate.x0 < row.x1 && plate.x1 > row.x0 && plate.y0 < row.y1 && plate.y1 > row.y0;
        return { row, plate, text: shown?.text ?? null, hit, hintText: window.__xrFrame.hintText() };
      }, dEnd.targets.keyRow);
      M.heldPlate = over;
      await shot('held-no-plate');
      C('held: no frame notice or hint is up (the table offer forced due and a notice sent while it is held)', !over.plate, JSON.stringify({ text: over.text, waiting: over.hintText }));
      C('held: nothing overlaps the set\'s button row (projected rects)', !over.hit, JSON.stringify({ row: over.row, plate: over.plate }));
      M.heldKeysInView = (await view(dEnd.targets.keys.map((k) => k.at))).every((v) => v.inView);
      C('held: its buttons are fully in view', M.heldKeysInView);
      await pressWorld(dEnd.targets.body, 1800);
      const after = await page.evaluate(() => window.__xrFrame.hintShown());
      C('put down, the table offer that waited is shown then', !!after && (after.text === OFFER || after.text.includes('notice')), after?.text ?? 'nothing');
      await shot('put-down-offer');
      await page.evaluate((t) => window.__teachingTv.take(t), r.tape); await wait(1800);
      const dc = await draws();
      await page.evaluate((t) => { window.__app.root.findByName(`lamby-set-${t}`).enabled = false; }, r.tape); await wait(80);
      const without = await draws();
      await page.evaluate((t) => { window.__app.root.findByName(`lamby-set-${t}`).enabled = true; }, r.tape);
      M.drawsHeld = { withSet: dc, without };
      C('the headset: with the set in the hand ≤ 75 draw calls (or the look already over without it), the set adding ≤ 3', (dc <= 75 || without > 75) && dc - without <= 3, `${dc} (${without} without the set)`);
    }

    // ── 2 · the set in the hand, pressed at its places ──────────────────────
    if (await key('play', 1500)) { await rate(); const d = await tvd(); C('▶ (its key) at the end plays it again from the start', d.state === 'playing' && d.t < 3 * RATE, `t ${d.t?.toFixed(1)}`); }
    { const d = await tvd(); await pressWorld(d.targets.glass, 1200); const e = await tvd(); C('a press on its glass pauses it', e.state === 'paused' && e.userPaused, e.state);
      await G('paused in the hand', 'frame', 'tv-play'); await deck('pause');
      const u = await uploadsIn(3000); M.uploadsPaused = u; C('paused, the glass uploads nothing', u === 0, `${u} in 3 s`); await shot('paused-in-hand'); }
    { const d = await tvd(); await pressWorld(d.targets.glass, 1500); const e = await tvd(); C('a press on its glass plays it again', e.state === 'playing', e.state); await deck('play'); }
    if (await key('pause', 1200)) { const d = await tvd(); C('❚❚ (its key) pauses it', d.state === 'paused', d.state); }
    // ⏭ ⏮ from a lesson whose neighbours are not a disc's trailer
    { const i = T.chapters.findIndex((c, k) => c.kind === 'lesson' && k > 0 && k + 1 < T.chapters.length && T.chapters[k + 1]?.kind !== 'trailer' && T.chapters[k - 1]?.kind !== 'trailer');
      if (i >= 0) { await page.evaluate((tape, t) => window.__teachingTv.play(tape, t), r.tape, T.chapters[i].start + 2); await wait(1500); await key('pause', 900); } }
    let ch0 = (await tvd()).chapter;
    if (await key('next', 1500)) { const d = await tvd(); C('⏭ goes on a part', d.chapter !== ch0, `${ch0} → ${d.chapter}`); ch0 = d.chapter; }
    if (await key('prev', 1500)) { const d = await tvd(); C('⏮ goes back a part', d.chapter !== ch0, `${ch0} → ${d.chapter}`); }
    const tr = T.chapters.find((c) => c.kind === 'trailer');
    if (tr) {
      await page.evaluate(({ tape, t }) => window.__teachingTv.play(tape, t), { tape: r.tape, t: tr.start + 0.5 }); await wait(1500);
      const before = (await tvd()).chapter;
      await key('next', 1200);
      const d = await tvd();
      C('during the disc\'s trailer ⏭ does nothing (his "this was a DVD": no skip)', d.chapter === before && d.chapterKind === 'trailer', `${before} → ${d.chapter}`);
      await key('pause', 900);
    }
    if (await key('eject', 1200)) { const d = await tvd(); C('⏏ stops it, the place kept', d.state === 'stopped' && d.place.t > 1, `${d.state} place ${d.place.t?.toFixed(1)}`);
      await G('stopped (⏏)', 'blank', 'tv-play'); await deck('stop');
      const u = await uploadsIn(2500); C('stopped, the glass uploads nothing', u === 0, `${u}`); await shot('ejected'); }
    { const kept = (await tvd()).place.t;
      if (await key('play', 700)) { const d = await tvd(); C('▶ resumes from the second it was stopped at', d.state === 'playing' && d.t >= kept - 0.1 && d.t <= kept + 1.6 * RATE, `t ${d.t?.toFixed(2)} kept ${kept.toFixed(2)}`); } }

    // ── 3 · PUT DOWN AND RESUME (his "they can get out of it, and it gets paused") ──
    await wait(2000);
    { const d = await tvd(); const tBefore = d.t;
      await pressWorld(d.targets.body, 1800); const e = await tvd();
      C('PUT DOWN (its body) while it plays: back in its place, paused at that second', e.pose === 'rest' && e.state === 'paused' && e.place.t >= tBefore - 0.05 && e.place.t <= tBefore + 1.2 * RATE, `${e.pose} ${e.state} place ${e.place.t?.toFixed(2)} (t ${tBefore?.toFixed(2)} at the press)`);
      await deck('pause');
      await shot('put-down-paused');
      const kept = e.place.t;
      // at rest: the eye turned to it (the computer and the phone turn; the headset's ray reaches it anyway), a press brings it
      const g = e.targets.glass;
      if (!xr) { const dx = g[0] - r.seat.x, dy = g[1] - r.seat.y, dz = g[2] - r.seat.z; await page.evaluate((s, p, y) => window.__camFree(s.x, s.y, s.z, p, y), r.seat, Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI, Math.atan2(-dx, -dz) * 180 / Math.PI); await wait(600); }
      await shot('at-rest-paused');
      await pressWorld(g, 1800); const f = await tvd();
      C('a press on the set at rest brings it close again, still paused (▶ stays the visitor\'s)', f.pose === 'held' && f.state === 'paused' && Math.abs(f.t - kept) < 0.1, `${f.pose} ${f.state} t ${f.t?.toFixed(2)}`);
      if (await key('play', 700)) { const h = await tvd(); C('▶ goes on from THE SAME SECOND it was put down at', h.state === 'playing' && h.t >= kept - 0.1 && h.t <= kept + 1.6 * RATE, `t ${h.t?.toFixed(2)} kept ${kept.toFixed(2)}`); } }
    await wait(1500);
    { const tBefore = await tNow();
      if (await key('power', 1800)) { const d = await tvd(); C('PUT DOWN (⏻) while it plays: back in its place, paused at that second', d.pose === 'rest' && d.state === 'paused' && d.place.t >= tBefore - 0.05 && d.place.t <= tBefore + 1.2 * RATE, `${d.pose} ${d.state} place ${d.place.t?.toFixed(2)} (t ${tBefore?.toFixed(2)})`); } }
    // ── 4 · Lamby's later offer: its yes brings the set (the guide's own act), not playing ──
    { const due = await page.evaluate(() => window.__os.tvOffer?.());
      C('Lamby\'s one later offer is due (the tape has more, the set at rest)', !!due, String(due));
      await page.evaluate(() => window.__os.onGuideTv?.()); await wait(1800);
      const d = await tvd(); C('the offer\'s yes brings the set to the visitor (▶ stays theirs: not playing)', d.pose === 'held' && d.state !== 'playing', `${d.pose} ${d.state}`); }
    // ── 5 · the story speaks while it plays in the hand: it pauses itself at that second and goes back ──
    await key('play', 1500);
    const tStory = await tNow();
    await page.evaluate((tape) => {
      if (tape === '2016') { const g = window.__graceQueue(); g.lambPriority = true; g.lambLines = ['…']; g.bump(); }
      else if (tape === '2026') window.__os.e4.browser.toast('mum', 'Mum', '…');
      else window.__os._toast = { text: '…', t: 6 };
    }, r.tape);
    await wait(1800);
    { const d = await tvd(); C('when the story speaks, the set pauses itself at that second and goes back to its place', d.state === 'paused' && !d.userPaused && d.pose === 'rest' && d.place.t >= tStory - 0.05 && d.place.t <= tStory + 1.6 * RATE, `${d.state} userPaused ${d.userPaused} ${d.pose} place ${d.place.t?.toFixed(2)} (t ${tStory?.toFixed(2)})`); await shot('story-spoke'); }
    await page.evaluate((tape) => {
      if (tape === '2016') { const g = window.__graceQueue(); g.lambPriority = false; g.lambLines = null; g.bump(); }
      else if (tape === '2026') window.__os.e4.browser.toasts = [];
      else window.__os._toast = null;
    }, r.tape);
    await wait(1000);
    // ── 6 · the Close: the era's website plays the ROOM copy from the set's place ──
    const placeT = (await tvd()).place.t;
    await page.evaluate((year) => window.__siteViewer.bus.openAt(year, 'media'), r.year);
    await wait(1800);
    let pressedAt = 0;
    for (let i = 0; i < 10; i++) {
      const st = await page.evaluate(({ file, xr, real }) => {
        const core = xr ? window.__siteViewer.xr.core : window.__siteViewer.dom;
        const h = core.mediaHits().find((k) => k.type === 'film' && k.file.endsWith(file)), vp = core.info().vp;
        if (!h) return { dy: 200 };
        const top = Math.max(h.sy, vp.y), bot = Math.min(h.sy + h.h, vp.y + vp.h);
        if (bot - top > 60) { if (real) return { press: { x: h.sx + h.w / 2, y: Math.round((top + bot) / 2) } }; core.press(h.sx + h.w / 2, Math.round((top + bot) / 2)); return { pressed: true }; }
        return { dy: h.sy - vp.y - 20 };
      }, { file: T.room.file, xr, real: WEBKIT_LOCK && !xr });
      if (st.press) {
        // under the emulated WebKit lock a film plays only from a trusted press: the viewer's own pointerup, a real one
        const at = await page.evaluate(async (q) => {
          const { logicalSize } = await import('/src/frame/siteViewer/domMount.ts');
          const sz = logicalSize(window.innerWidth, window.innerHeight), r = document.querySelector('#reinterp-site-viewer canvas').getBoundingClientRect();
          return { x: r.left + (q.x / sz.W) * r.width, y: r.top + (q.y / sz.H) * r.height };
        }, st.press);
        if (phone) await page.touchscreen.tap(at.x, at.y);
        else { await page.mouse.move(at.x, at.y); await wait(60); await page.mouse.down(); await wait(70); await page.mouse.up(); }
        pressedAt = Date.now(); break;
      }
      if (st.pressed) { pressedAt = Date.now(); break; }
      if (xr) { await page.evaluate((d) => { window.__controller.gamepad.axes = [0, 0, 0, d > 0 ? 1 : -1]; }, st.dy); await wait(500); await page.evaluate(() => { window.__controller.gamepad.axes = [0, 0, 0, 0]; }); }
      else await page.evaluate((dy) => { const c = document.querySelector('#reinterp-site-viewer canvas'); const rr = c.getBoundingClientRect(); c.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, bubbles: true, cancelable: true, clientX: rr.x + rr.width / 2, clientY: rr.y + rr.height / 2 })); }, st.dy);
      await wait(500);
    }
    await wait(3500);
    const film = await page.evaluate((xr) => (xr ? window.__siteViewer.xr.core : window.__siteViewer.dom).info().film, xr);
    const ran = pressedAt ? (Date.now() - pressedAt) / 1000 : 0;
    await shot('close-site-film');
    await page.evaluate(() => window.__siteViewer.close()); await wait(800);
    C('at the Close the era\'s website goes on from the second the set was left at (the room copy)', film.file && film.file.endsWith(T.room.file) && film.state === 'playing' && film.t >= placeT - 0.1 && film.t <= placeT + ran + 0.5,
      `film ${film.file} ${film.state} t ${film.t?.toFixed(2)} (place ${placeT.toFixed(2)}, ${ran.toFixed(1)} s after the press)`);
    if (mode === 'desktop') {
      const html = fs.readFileSync(`public/sites/${r.year}/index.html`, 'utf8');
      const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const has = (x) => html.includes(esc(x)) || html.includes(x);
      const items = (T.breakLong?.sections ?? []).flatMap((s) => s.items);
      C('the era site carries the long break as text (every item)', items.every((it) => has(it.text)), `${items.filter((it) => has(it.text)).length}/${items.length}`);
      if (v6) {
        const plain = (x) => esc(x).replace(/\[(\d+)\]/g, '');
        const bars = T.bar ?? [], refs = T.references ?? [];
        C('v6: the era site prints every [n] line with its time, each number a link to its reference', bars.every((b) => html.includes(plain(b.text).trim()) && b.refs.every((n) => html.includes(`href="#ref-${r.tape}-${n}"`))), `${bars.length} lines`);
        C('v6: the era site prints every reference (number, citation, the sentence on it)', refs.every((x) => html.includes(`id="ref-${r.tape}-${x.n}"`) && has(x.citation) && has(x.about)), `${refs.length} references`);
        C('v6: the captions track is OFF by default (the picture carries the subtitles)', new RegExp(`teaching/${r.tape}/captions\\.vtt" srclang="en" label="English">`).test(html));
      } else {
        C('the era site carries every margin line\'s full source', T.margin.every((m) => has(m.source)), `${T.margin.length}`);
      }
      C('the era site plays room.mp4 (web.mp4 is not shipped)', html.includes(`teaching/${r.tape}/room.mp4`) && !html.includes(`teaching/${r.tape}/web.mp4`) && !fs.existsSync(`public/assets/video/teaching/${r.tape}/web.mp4`));
    }
    // ── 7 · the update, armed while it plays in the hand: it stops and goes back ──
    if (!xr) await turn(0, r.seat.pitch); else await turn(0, 0);
    await page.evaluate((t) => window.__teachingTv.take(t), r.tape); await wait(1600);
    await key('play', 2000);
    const before = await tvd();
    await page.evaluate((k) => window.__os.armUpdate(k), r.update);
    for (let k = 0; k < 30 && !(await page.evaluate(() => window.__os.updateArmed)); k++) {
      if (k === 4) await page.evaluate(() => { const os = window.__os; const h = os.hits?.find((x) => x.id === 'wotd-ok' || x.id === 'pause-close'); if (h) os.handleClick(h.x + h.w / 2, h.y + h.h / 2); });
      await wait(500);
    }
    await wait(1600);
    { const d = await tvd(); const u = await page.evaluate(() => ({ armed: window.__os.updateArmed, era: window.__os.era }));
      C('at the era\'s update the set stops (the place kept) and goes back', d.state === 'stopped' && d.place.t >= before.t - 0.5 && d.pose === 'rest', `${d.state} ${d.pose} place ${d.place.t?.toFixed(1)} · update ${JSON.stringify(u)}`); await shot('update-stopped'); }
  } catch (e) { errors.push(String(e).slice(0, 300)); console.error(e); }
  C('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.close();
}

const modes = MODE === 'all' ? ['desktop', 'xr', 'phone'] : [MODE];
for (const mode of modes) for (const r of ROOMS) { if (!ONLY || ONLY === r.tape) { console.log(`\n── ${mode} · ${r.tape}`); await room(r, mode); } }
fs.writeFileSync(path.join(OUT, `report-${MODE}${ONLY ? '-' + ONLY : ''}.json`), JSON.stringify({ port: PORT, checks, measures }, null, 1));
await browser.close();
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
