#!/usr/bin/env node
/**
 * ⚑ S429 (UiB job 38 D; his 26 Nov: "Why? What is the logic of stopping there? either the music is part of the scene or not"; and
 * "a stop before every time it loops the song") — GRACEPLATFORM'S MUSIC, HEARD HEADLESS, on presses.
 *
 *     node tools/s429-music-probe.mjs --port 5811 [--build after]
 *
 * Chrome runs with --autoplay-policy=no-user-gesture-required (tools/harness/e3-route.mjs), and before the page's own scripts this
 * probe wraps what plays sound: every AudioBufferSourceNode start and stop (its buffer, its loop points, the offset it starts from)
 * and every play / pause of an <audio> element carrying grace_loop_2016.mp3. 2016 is played by presses to each moment that used to
 * stop the loop — This week, the memory page, her Notes, Bea's news, URGENT (where it came back), the review — and at each the probe
 * reads whether the loop is playing (tapeAudio `playingNow()`, on every build), its position and level. Under a tape (Heartwood's,
 * brought and played) it must be LOWER and still playing; afterwards back, from where it was. Over the whole of 2016 the loop must be
 * started once (no stop-and-start-over). The mute, the mixer's music slider and the menu's pause are pressed through their own
 * functions. The loop points are read off the started source, in samples, and the join is measured on the decoded samples.
 * Writes out/s429/s429-music_<build>.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { launch, ff, e3, press, targets, playTo, wait } from './harness/e3-route.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const BUILD = flag('build', String(PORT));
const OUT = path.resolve(flag('out', 'out/s429'));
fs.mkdirSync(OUT, { recursive: true });

// ── the wrap, before the page's scripts ──
const init = () => {
  const log = window.__soundLog = [];
  const S = AudioBufferSourceNode.prototype, start = S.start, stop = S.stop;
  S.start = function (when, offset, dur) {
    log.push({ t: Math.round(performance.now()), what: 'source.start', offset: offset ?? 0, loop: this.loop, loopStart: this.loopStart, loopEnd: this.loopEnd,
      length: this.buffer?.length ?? null, rate: this.buffer?.sampleRate ?? null, seconds: this.buffer ? Math.round(this.buffer.duration * 1000) / 1000 : null });
    return start.apply(this, arguments);
  };
  S.stop = function () { if (this.loop) log.push({ t: Math.round(performance.now()), what: 'source.stop' }); return stop.apply(this, arguments); };
  const M = HTMLMediaElement.prototype, play = M.play, pause = M.pause;
  M.play = function () { if (/grace_loop/.test(this.src || '')) log.push({ t: Math.round(performance.now()), what: 'element.play', at: Math.round(this.currentTime * 1000) / 1000, loop: this.loop }); return play.apply(this, arguments); };
  M.pause = function () { if (/grace_loop/.test(this.src || '')) log.push({ t: Math.round(performance.now()), what: 'element.pause', at: Math.round(this.currentTime * 1000) / 1000 }); return pause.apply(this, arguments); };
};

const { browser, page, errors, view } = await launch(PORT, { mode: 'desktop', scale: 1, init });
const say = (m) => console.log(m);
const result = { port: PORT, build: BUILD, moments: [], checks: [], errors };
const check = (id, what, ok, detail) => { result.checks.push({ id, what, ok: ok === null ? null : !!ok, detail }); say(`${ok === null ? 'n/a ' : ok ? 'PASS' : 'FAIL'} ${id} ${what} — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`); };
const live = async () => new Set((await targets(page, view)).map((t) => t.id));
const tryPress = async (...ids) => { const l = await live(); for (const id of ids) if (l.has(id)) { await press(page, view, id); await ff(page, 0.3); return id; } return null; };
/** the loop now: playing (on every build: what tapeAudio says is playing), its position and level */
const loopNow = () => page.evaluate(async () => {
  const mix = await import('/src/audio/mix.ts'), G = window.__graceQueue();
  const st = G.graceLoopState ?? null;
  if (st) return { playing: window.__sound.playingNow().includes('grace_loop_2016.mp3'), web: true, position: st.position, level: st.level, duck: st.duck, starts: st.starts, ctx: st.context };
  const el = G.graceLoop;   // the build before: an <audio> element (or null while it is stopped)
  return { playing: !!el && !el.paused && !el.ended, web: false, position: el ? Math.round(el.currentTime * 1000) / 1000 : null, level: el ? (el.muted ? 0 : Math.round(mix.nativeVolume(el) * 1000) / 1000) : 0 };
});
const moment = async (name, expectPlaying = true) => {
  await wait(700);   // real time: the loop's own clock runs on the AudioContext
  const a = await loopNow(); await wait(600); const b = await loopNow();
  const m = { name, ...b, advancing: a.position !== null && b.position !== null && b.position !== a.position };
  result.moments.push(m);
  check('D', `the music at ${name}`, expectPlaying ? b.playing && m.advancing : null, `${b.playing ? 'playing' : 'NOT playing'}; position ${a.position} → ${b.position}; level ${b.level}${b.duck !== undefined ? `; duck ${b.duck}` : ''}`);
  return m;
};

// ═══ 2016, by presses ═══
await playTo(page, view, (s) => s.mode === 'board' && s.week, { log: () => {} });
await moment('This week (the card over the board)');
await tryPress('week-begin');
// Lesson 1, then Heartwood's tape: brought and played (a sound of its own)
await playTo(page, view, (s) => s.lessons[0] === 'done' && (s.mode === 'board' || s.mode === 'done'), { log: () => {}, heartwood: 'bring' });
for (let i = 0; i < 90; i++) {
  const l = await live();
  if (l.has('lg-take@call')) { await tryPress('lg-take@call'); await ff(page, 4); continue; }
  const play = [...l].find((id) => id.startsWith('tv-play@'));
  if (play) { await press(page, view, play); await ff(page, 0.5); break; }
  // the offer comes once Lesson 1 and the Mentor's message are behind her, on a quiet board
  if (l.has('mirror:lock-card:Mentor')) { await tryPress('mirror:lock-card:Mentor'); await ff(page, 10); await tryPress('mirror:back'); await tryPress('mirror:back'); continue; }
  await ff(page, 1);
}
const tape = await page.evaluate(async () => (await import('/src/state/voiceHold.ts')).filmAudible());
if (tape) {
  const under = await moment('Heartwood\'s tape playing (a sound of its own)', false);
  result.underTape = under;
  const level0 = result.moments[0].level;
  check('D', 'under the tape it is lower, and still playing', under.playing && under.advancing && under.level < level0 * 0.6, `level ${under.level} (it plays at ${level0}); ${under.playing ? 'playing' : 'NOT playing'}`);
  // the set put back: the loop comes back where it was (no new start)
  const body = [...(await live())].find((id) => id.startsWith('tv-body@'));
  if (body) { await press(page, view, body); await ff(page, 3); }
  const back = await moment('after the tape (the set put back)');
  check('D', 'after the tape it comes back to its level', back.level >= level0 * 0.9, `level ${back.level}`);
} else check('D', 'Heartwood\'s tape', null, 'the set was not brought on this run');
// Lessons 2 and 3, Mam's message, the memory page
await playTo(page, view, (s) => s.page === 'record', { log: () => {} });
await moment('the memory page (the Story Record)');
await ff(page, 40);
await tryPress('memory-close'); await ff(page, 0.5);
await tryPress('mirror:evening-banner', 'mirror:lock-notice'); await ff(page, 3);
await moment('her Notes (her line typing)');
await ff(page, 12);
await tryPress('mirror:back'); await ff(page, 4);
await tryPress('mirror:lock-card:Nuala'); await ff(page, 12);
await tryPress('mirror:evening-banner', 'mirror:lock-notice'); await ff(page, 3);
await moment('Bea\'s news (the group filling)');
await playTo(page, view, (s) => s.kitPopin, { log: () => {}, limit: 80 });
const urgent = await moment('URGENT (the kit pops in)');
// the menu's pause: held where it is, and on from there; the mute; the mixer's music slider
{
  const r = await page.evaluate(async () => {
    const mix = await import('/src/audio/mix.ts'), G = window.__graceQueue();
    const T = window.__sound ?? await import('/src/audio/tapeAudio.ts');   // the app's own (the build before has no __sound)
    const st = () => G.graceLoopState ?? { level: G.graceLoop && !G.graceLoop.muted ? mix.nativeVolume(G.graceLoop) : 0, position: G.graceLoop?.currentTime ?? null, sounding: !!G.graceLoop && !G.graceLoop.paused };
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    const out = {};
    T.setOneShotsPaused(true); await sleep(600); const h0 = st(); await sleep(600); const h1 = st(); T.setOneShotsPaused(false); await sleep(400); const h2 = st();
    out.menu = { held: [h0.position, h1.position], after: h2.position, sounding: h2.sounding };
    T.setOneShotsMuted(true); await sleep(500); const m0 = st(); T.setOneShotsMuted(false); await sleep(500); const m1 = st();
    out.mute = { muted: m0.level, back: m1.level };
    const lv = st().level; mix.setChannel('music', 0.5); await sleep(500); const half = st().level; mix.setChannel('music', 1); await sleep(500);
    out.slider = { full: lv, half };
    return out;
  });
  result.controls = r;
  check('D', 'the menu\'s pause holds it where it is, and it goes on from there', r.menu.held[0] === r.menu.held[1] && r.menu.after !== null && r.menu.after >= r.menu.held[1], JSON.stringify(r.menu));
  check('D', 'the mute silences it (and unmuted it is back)', r.mute.muted < 0.01 && r.mute.back > 0.05, JSON.stringify(r.mute));
  check('D', 'the music slider reaches it', Math.abs(r.slider.half - r.slider.full / 2) < 0.02, JSON.stringify(r.slider));
}
await tryPress('kit-popin-open'); await ff(page, 1);
await tryPress('vera-kit-approve'); await tryPress('vera-kit-close'); await ff(page, 1);
await tryPress('mirror:evening-banner', 'mirror:lock-notice'); await ff(page, 4);
await moment('the review (the platform removing the news)');

// ── over the whole of 2016: started once, never stopped and started over ──
const log = await page.evaluate(() => window.__soundLog);
result.soundLog = log;
const starts = log.filter((e) => e.what === 'source.start' && e.loop), plays = log.filter((e) => e.what === 'element.play'), pauses = log.filter((e) => e.what === 'element.pause');
const held = result.controls?.menu?.held?.[1];
check('D', 'from sign-in to the review the loop was started once, and once more where the menu\'s hold left it — never stopped and started over',
  plays.length === 0 && starts.length === 2 && held !== undefined && Math.abs(starts[1].offset - starts[1].loopStart - held) < 0.1,
  `Web Audio loop starts ${starts.length} (from ${starts.map((s) => Math.round((s.offset - s.loopStart) * 1000) / 1000).join(' s, then ')} s; the menu held it at ${held} s); <audio> plays ${plays.length}, pauses ${pauses.length}`);
// ── the loop points, in samples, and the join ──
if (starts.length) {
  const s0 = starts[0];
  result.loopPoints = { rate: s0.rate, bufferLength: s0.length, seconds: s0.seconds, loopStartSample: Math.round(s0.loopStart * s0.rate), loopEndSample: Math.round(s0.loopEnd * s0.rate) };
  result.join = await page.evaluate(() => window.__graceQueue().graceLoopJoin?.() ?? null);
  const j = result.join;
  check('D', 'sample-accurate loop points: the music\'s own first and last samples (64.000 s; the MP3\'s delay and padding outside them)',
    s0.loop && Math.abs((s0.loopEnd - s0.loopStart) - 64) < 1 / s0.rate * 2, JSON.stringify(result.loopPoints));
  check('D', 'no gap at the join: its last and first 10 ms as loud as the music, the step across it an ordinary one',
    !!j && j.rmsTail > j.rmsWhole * 0.3 && j.rmsHead > j.rmsWhole * 0.3 && j.jump <= j.stepP99, JSON.stringify(j));
} else check('D', 'loop points', false, `no Web Audio loop: an <audio> element looping the file (plays ${plays.length}, pauses ${pauses.length})`);

const pass = result.checks.filter((c) => c.ok === true).length, fail = result.checks.filter((c) => c.ok === false).length;
result.summary = { pass, fail };
fs.writeFileSync(path.join(OUT, `s429-music_${BUILD}.json`), JSON.stringify(result, null, 1));
say(`${BUILD}: PASS ${pass} · FAIL ${fail} · errors ${errors.length}`);
await browser.close();
process.exit(fail ? 1 : 0);
