/**
 * S248 — the mixer, checked in a real browser. Reaches the setup's sound balloon (real mouse), photographs the
 * trackbar, presses − / + / the groove, opens the game menu, photographs the Sound section, and then proves that
 * master and each channel move the REAL (native) volume of a playing element of that channel while the mute still
 * silences everything. Photographs to out/volume/.
 *   node tools/volume-check.mjs --port 3131
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const i = process.argv.indexOf('--port');
if (i < 0) throw new Error('Pass --port');
const port = Number(process.argv[i + 1]);
const out = path.resolve('out/volume'); fs.mkdirSync(out, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const errors = [], checks = [];
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.002, `${msg}: got ${a}, wanted ${b}`);
try {
  for (const [name, width, height] of [['desktop', 1280, 720], ['phone', 390, 844]]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: name === 'phone', hasTouch: name === 'phone' });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (['error'].includes(m.type())) errors.push(m.text()); });
    // wrap window.Audio: remember every element the piece makes
    await page.evaluateOnNewDocument(() => {
      const Orig = window.Audio; window.__els = [];
      window.Audio = function (src) { const a = new Orig(src); window.__els.push(a); return a; };
      window.Audio.prototype = Orig.prototype;
    });
    await page.goto(`http://localhost:${port}/?reinterp=1&entrance=restore&debug=1&kiosk=0`, { waitUntil: 'load', timeout: 180000 });
    await page.waitForSelector('#restore-entrance[data-phase="wake"]', { timeout: 120000 });
    await wait(8000);
    const press = async (id) => {
      await page.waitForFunction((id) => JSON.parse(document.getElementById('restore-entrance')?.dataset.setupHits || '[]').some((h) => h.id === id), { timeout: 30000 }, id);
      const h = await page.evaluate((id) => JSON.parse(document.getElementById('restore-entrance').dataset.setupHits).find((h) => h.id === id), id);
      if (name === 'phone') await page.touchscreen.tap(h.x + h.w / 2, h.y + h.h / 2); else await page.mouse.click(h.x + h.w / 2, h.y + h.h / 2);
      await wait(250);
      return h;
    };
    if (name === 'phone') await page.touchscreen.tap(width / 2, height / 2); else await page.mouse.click(width / 2, height / 2);
    await page.waitForFunction(() => window.__os?.setup?.stage === 'balloon-1'); await wait(1600);
    await press('setup-choice-0'); await press('setup-choice-0'); await press('setup-close');
    await press('setup-choice-0'); await press('setup-close');
    await page.waitForFunction(() => window.__os.setup.stage === 'balloon-4', { timeout: 30000 }); await wait(600);
    const hitIds = await page.evaluate(() => JSON.parse(document.getElementById('restore-entrance').dataset.setupHits).map((h) => h.id));
    for (const id of ['setup-vol-down', 'setup-vol-up', 'setup-vol-thumb', 'setup-vol-track', 'setup-test']) assert.ok(hitIds.includes(id), `${name}: ${id} published`);
    await page.screenshot({ path: path.join(out, `${name}-setup-sound-step.png`) });
    fs.writeFileSync(path.join(out, `${name}-setup-sound-canvas.png`), Buffer.from((await page.evaluate(() => window.__os.canvas.toDataURL())).split(',')[1], 'base64'));

    const mixState = () => page.evaluate(async () => { const m = await import('/src/audio/mix.ts'); return { master: m.getMaster(), ch: Object.fromEntries(m.CHANNELS.map((c) => [c, m.getChannel(c)])) }; });
    assert.equal((await mixState()).master, 0.7, 'default master is 0.7');
    // the test sound plays in place and answers the trackbar live
    await press('setup-test');
    const native = () => page.evaluate(async () => {
      const m = await import('/src/audio/mix.ts');
      const el = window.__els.filter((e) => /chime_2003/.test(e.src)).pop();
      return el ? { v: m.nativeVolume(el), g: m.fileGain('chime_2003.mp3'), rel: el.volume } : null;
    });
    let t = await native(); assert.ok(t, 'the test sound element exists');
    near(t.v, t.g * 0.7, `${name}: test sound at master 0.7`);
    await press('setup-vol-up'); await press('setup-vol-up');
    t = await native(); near(t.v, Math.min(1, t.g * 0.9), `${name}: master 0.9 after two + presses`);
    assert.equal((await mixState()).master, 0.9);
    await press('setup-vol-down'); await press('setup-vol-down'); await press('setup-vol-down'); await press('setup-vol-down');
    t = await native(); near(t.v, t.g * 0.5, `${name}: master 0.5 after four - presses`);
    // the groove: a press at its far left sets 0 ("off"), its far right 1.0
    const track = await page.evaluate(() => JSON.parse(document.getElementById('restore-entrance').dataset.setupHits).find((h) => h.id === 'setup-vol-track'));
    const click = async (x, y) => { if (name === 'phone') await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await wait(250); };
    await click(track.x + 1, track.y + track.h / 2);
    assert.equal((await mixState()).master, 0, 'groove left end = off');
    await page.screenshot({ path: path.join(out, `${name}-setup-sound-step-off.png`) });
    await click(track.x + track.w - 1, track.y + track.h / 2);
    assert.equal((await mixState()).master, 1, 'groove right end = 100%');
    await click(track.x + track.w * 0.7, track.y + track.h / 2);
    const mm = (await mixState()).master; assert.ok(mm >= 0.6 && mm <= 0.8, `groove press near 70% (${mm})`);
    await page.evaluate(async () => (await import('/src/audio/mix.ts')).setMaster(0.7));
    await press('setup-vol-up'); await press('setup-vol-down');   // back to 0.7, and the redraw is clean
    await page.screenshot({ path: path.join(out, `${name}-setup-sound-step.png`) });
    checks.push(`${name}: trackbar published (− + thumb groove), test sound plays in place and follows − / + / groove`);

    // ── the menu ──
    await page.keyboard.press('Escape'); await wait(500);
    await page.screenshot({ path: path.join(out, `${name}-menu-main.png`) });
    const clickMenuRow = async (text) => {
      const ok = await page.evaluate((text) => { const b = [...document.querySelectorAll('#reinterp-game-menu button')].find((b) => b.textContent.startsWith(text)); if (!b) return false; b.click(); return true; }, text);
      assert.ok(ok, `menu row "${text}"`); await wait(300);
    };
    await clickMenuRow('Sound levels');
    await page.screenshot({ path: path.join(out, `${name}-menu-sound.png`) });
    const sliders = await page.evaluate(() => [...document.querySelectorAll('#reinterp-game-menu input[type=range]')].map((s) => s.labels?.[0]?.textContent));
    assert.deepEqual(sliders, ['Master', 'Music', 'Rooms', 'Voices & tapes', 'Effects', 'The welcome film'], 'six sliders, labelled');

    // make one source per channel: one-shots, the tape bus (hiss + a song), the room bed
    await page.evaluate(async () => {
      const t = await import('/src/audio/tapeAudio.ts');
      t.playOnce('lambyos_home_loop.mp3'); t.playOnce('l_u1a.mp3'); t.playOnce('ui_press.mp3'); t.playLoop('session_breath.mp3');
      t.roomBed.set('bed_2003.mp3', 0.01);
      const bus = new t.TapeAudioBus(); bus.start('family_design_solutions_tape97.mp3'); window.__bus = bus;
      const v = document.createElement('video'); v.src = 'assets/video/lambyos_welcome_home.mp4'; t.adoptOneShot(v, 'lambyos_welcome_home.mp4'); window.__film = v;
      for (let k = 0; k < 30; k++) t.roomBed.update(0.1);   // finish the bed's fade-in
    });
    const survey = () => page.evaluate(async () => {
      const m = await import('/src/audio/mix.ts');
      const els = [...window.__els, window.__film].filter(Boolean);
      return els.map((e) => ({ file: e.src.split('/').pop(), ch: m.channelOfElement(e), native: m.nativeVolume(e), rel: e.volume, gain: m.fileGain(e.src.split('/').pop()), muted: e.muted, paused: e.paused }))
        .filter((r) => r.ch && !/lambient|chime_2003/.test(r.file));
    });
    const setSlider = async (label, pctv) => page.evaluate((label, pctv) => {
      const s = [...document.querySelectorAll('#reinterp-game-menu input[type=range]')].find((s) => s.labels?.[0]?.textContent === label);
      s.value = String(pctv); s.dispatchEvent(new Event('input', { bubbles: true }));
    }, label, pctv);
    const expectAll = async (master, chans, why) => {
      const rows = await survey();
      const seen = new Set();
      for (const r of rows) {
        near(r.native, Math.min(1, r.rel * r.gain * chans[r.ch] * master), `${name}: ${why}: ${r.file} (${r.ch})`);
        seen.add(r.ch);
      }
      return seen;
    };
    const full = { music: 1, room: 1, voices: 1, effects: 1, film: 1 };
    let seen = await expectAll(0.7, full, 'baseline');
    for (const c of ['music', 'room', 'voices', 'effects', 'film']) assert.ok(seen.has(c), `${name}: a ${c} element exists (${[...seen]})`);
    await setSlider('Master', 40); await expectAll(0.4, full, 'master 40');
    await setSlider('Master', 70);
    const label = { music: 'Music', room: 'Rooms', voices: 'Voices & tapes', effects: 'Effects', film: 'The welcome film' };
    for (const c of Object.keys(label)) {
      await setSlider(label[c], 50);
      await expectAll(0.7, { ...full, [c]: 0.5 }, `${c} 50`);
      await setSlider(label[c], 0);
      await expectAll(0.7, { ...full, [c]: 0 }, `${c} off`);
      await setSlider(label[c], 100);
    }
    await expectAll(0.7, full, 'all back to full');
    await page.screenshot({ path: path.join(out, `${name}-menu-sound.png`) });
    checks.push(`${name}: master and each of the five channels move the native volume of playing elements of that channel (tape bus + hiss, room bed, one-shots, loops, adopted film); zero = silent`);

    // ── the mute still silences everything ──
    await clickMenuRow('Sound: on');
    // (the test's own second tape bus is not the app's, so the app's mute cannot reach it: its own setMuted is exercised directly)
    const isBus = (r) => /tape-hiss|family_design/.test(r.file);
    const muted = (await survey()).filter((r) => !isBus(r));
    assert.ok(muted.length > 0 && muted.every((r) => r.muted), `${name}: mute silences every element: ${JSON.stringify(muted.filter((r) => !r.muted).map((r) => r.file))}`);
    await page.evaluate(() => window.__bus.setMuted(true));
    assert.ok((await survey()).filter(isBus).every((r) => r.muted), `${name}: the tape bus mutes (hiss and clip)`);
    await page.evaluate(async () => { const t = await import('/src/audio/tapeAudio.ts'); t.playOnce('ui_press.mp3'); });
    assert.ok((await survey()).filter((r) => !isBus(r)).every((r) => r.muted), `${name}: a new sound while muted is muted`);
    await clickMenuRow('Sound: muted');
    // (the press sound made while muted had already ended, and a finished clip leaves the live set: it keeps its flag, harmlessly)
    const stillMuted = (await survey()).filter((r) => !isBus(r) && r.muted && r.file !== 'ui_press.mp3');
    assert.deepEqual(stillMuted, [], `${name}: unmute restores`);
    checks.push(`${name}: the existing mute still silences every source, and a sound started while muted`);
    await page.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  fs.writeFileSync(path.join(out, 'CAPTURE.json'), JSON.stringify({ port, checks, errors }, null, 2) + '\n');
}
console.log(checks.join('\n'));
