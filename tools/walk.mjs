#!/usr/bin/env node
/**
 * WALK — the ordinary path, clicked, and written down.
 *
 *     node tools/walk.mjs --port 3000            # walk, log, report
 *     node tools/walk.mjs --port 3000 --max 400  # bound the step count
 *
 * ⚑ WHY THIS EXISTS. `check-spec`'s C6 proves every beat has a DEBUG BUTTON.
 * Nothing in this repo has ever proved a beat is reachable WITHOUT one, and the
 * gap has cost this project an era with no exit, a conductor switched off for
 * half the piece, and an ending on a device that projected off-screen. Every one
 * was green under every check. `tools/shots.mjs`'s assertion 6 was specified for
 * exactly this and never built. This is that assertion, built.
 *
 * ⚑ AND IT IS ALSO THE SOURCE FOR THE MAP. Sérgio: *"use the audit to keep track
 * of all the actions so they can be used to build the Narrative/interaction map
 * to add into the Intake record."* So this does not print and forget: every press
 * is recorded with the control it hit, where that control sits on its surface,
 * where that landed on screen, and what moved in the ledger. The run writes a
 * machine-readable log and a readable report into `docs/reinterp/`. The
 * interaction map has been hand-written from the code twice and was wrong both
 * times; a map generated from a real playthrough cannot be.
 *
 * ⚑ THE RULES IT PLAYS BY, and they are the point:
 *  · **No `?era=`, no debug jumps, no `debugBeat`, no `__requestMove`.** The only
 *    review parameter used is `&debug=1`, and only to READ probes — never to
 *    press a panel button, never to teleport. If a beat cannot be reached by
 *    clicking, that is the finding, and the walk stops and says so.
 *  · **Clicks are real.** `mouse.move` -> `down` -> ~70 ms -> `up`, which is what
 *    the piece's own press law resolves (S80: a press that travels is a look, a
 *    press that stays is a tap). An `el.click()` on the canvas proves nothing.
 *  · **It aims at real controls.** The UI is drawn to offscreen canvases and
 *    textured onto meshes, so page pixels are not canvas pixels. The walker
 *    reads the live hit rects each surface registered for itself, and projects
 *    a rect's centre through that surface's own world transform — the exact
 *    inverse of `era3Devices.ts`'s `hitPlane()`, including its empirically
 *    calibrated `v = 0.5 + lz/h` sign. Guessing page pixels is how earlier
 *    attempts "pressed" invisible dialogs for six steps and reported nothing.
 *  · **It turns its head.** The only bodily ask in this piece is the turn, and
 *    until 2026-09-11 this tool could not make it: it stared at the authored
 *    bearing and called everything off-axis unreachable. It now looks round with
 *    the arrow keys — the same 6°-per-press look-in-place a player has, never
 *    `__camFree` — before it writes anything off, and undoes a turn that found
 *    nothing. See the TURN block below for what the old rigid neck cost.
 *  · **It is autonomous, not scripted.** A scripted path only finds the faults
 *    you already expected. This one reads the live state each step and chooses,
 *    so it walks into content nobody remembered was there.
 *
 * ⚑ THE SWEEP, and what it found. Two surfaces used to publish no hit rects at
 * all — `KitApp` (Era 1's booklet) and `UpdateApp` (every era transition in the
 * piece) — computing their button geometry a second time inside `handleClick`.
 * Rather than copy that geometry here, which would be a third copy rotting
 * quietly, the walker SWEEPS: it presses a coarse grid until the state moves,
 * and records the point that worked. That is also how a person finds a button.
 *
 * ⚑ Both were fixed on 2026-08-28 (they now register their rects while drawing,
 * like every other surface), and the kit's two copies HAD already drifted: NEXT
 * was drawn 60 px wide but click-tested at 100, so 40 px of blank paper turned
 * the page. The sweep stays, because it is what tells "no control here" apart
 * from "a control nothing can see", and the next such surface will not announce
 * itself either. Beware the softer case it also has to handle: a surface can be
 * momentarily EMPTY and perfectly healthy — Caleb between beats, L while she is
 * speaking — and an early version of this tool wrongly reported four of those
 * as broken.
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const flag = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
};
const PORT = Number(flag('port', 3000));
/**
 * ⚑ `--jump <beat>` IS FOR DIAGNOSING THIS TOOL, NEVER FOR PROVING REACHABILITY.
 * A full walk takes ~25 minutes, which is far too slow a loop when the question
 * is "why did the walker not see Era 4's chips". So this jumps once, with
 * `debugJump`, and then walks forward from there by ordinary clicking.
 *
 * A jumped run PROVES NOTHING about whether a player can get to that beat — the
 * jump is exactly the crutch this whole tool exists to do without. So a jumped
 * run stamps itself, in the log, in the JSON and at the top of the report, and
 * writes to a different filename so it can never be mistaken for the real thing.
 */
const JUMP = flag('jump', '');
/**
 * ⚑ `--min-tabs N` — THE MINIMUM PATH, defined narrowly enough to mean something
 * (2026-09-11). Sérgio has said three times that Era 4 takes too long, and every
 * number this tool gave him measured an EXHAUSTIVE traversal: the walker reads
 * every tab, presses every card, and its step count for the era therefore says
 * nothing about the optional path that was built. His answer to "what does the
 * minimum player do with the six tabs" was: **opens two, then wears.**
 *
 * So this mode does exactly that and nothing else: in Era 4's browser stage the
 * walker opens the first N tabs the row offers after the live one — `chat`, then
 * `record`, in ladder order — and then treats the browser as finished, which
 * sends it to the headset. Every other era is walked as before, so the numbers
 * stay comparable era to era. It is NOT a "skip everything optional" mode; the
 * tool cannot know structurally what is optional, and pretending it could would
 * be a policy measuring itself. The report is written to a `_MIN<N>` filename so
 * it can never be mistaken for the exhaustive walk.
 */
const MIN_TABS = flag('min-tabs', '') === '' ? null : Number(flag('min-tabs', ''));
/**
 * ⚑ A REVIEW ROUTE THAT LIES IS WORSE THAN NO REVIEW ROUTE (A-5.2).
 * `--jump update3` arms the u3 ritual through `__os.debugJump`, and the OS half
 * works: the notice, the terms and the install all play on Room 1's monitor and
 * the desktop duly becomes `e3`. The ROOM's half does not. `debugJump` never
 * moves the space — its own comment says so ("the ROOM does not follow these") —
 * so the ritual finishes with `cluster.era` still at `e1`, and app.ts's
 * `driveMorphSpace` finds no `relocationFor('e1','e3')` plan, takes neither the
 * relocation branch nor the `seatCut` fallback, and leaves the camera sitting in
 * Room 1. Era 3's devices are switched on correctly — in a room the player is
 * not in. Every rect the workstation publishes then projects behind the camera,
 * the walk stalls in front of an era it appears to have reached, and the report
 * reads as a fault in the piece. It is a fault in the way in.
 *
 * The honest options were to seed the room the way the real transition does, or
 * to refuse. Seeding means this tool keeping its own copy of which era each
 * ritual belongs to and driving `onEraShift` by hand — a second copy of the
 * architecture, which is the exact habit this file's other notes were written to
 * break. So it refuses, by name and with the reason, and `--allow-broken-jump`
 * is there so the day somebody fixes the route they can prove it in one command
 * rather than deleting this list on faith.
 */
const BROKEN_JUMPS = {
  update3:
    'it arms the u3 ritual but never moves the room. The ritual completes, the desktop\n' +
    '  becomes e3, and the camera is still in Room 1 — so Era 3\'s workstation is enabled\n' +
    '  two rooms away and everything on it projects behind the camera. A walk from here\n' +
    '  reports an inert Era 3 that is not inert.',
  u3Dispersal:
    'it goes through update3 (see above) and inherits the same unmoved room.'
};
const ALLOW_BROKEN_JUMP = process.argv.includes('--allow-broken-jump');
const MAX_STEPS = Number(flag('max', 320));
const VIEW = { width: 1280, height: 900 };
const OUT_DIR = join(ROOT, 'docs/reinterp');
const SHOT_DIR = flag('shots', '/private/tmp/claude-501/-Users-sergiogalvaoroxo-update-available-reinterp/075bbfca-c1d9-46aa-9460-981c2835de49/scratchpad/walk');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * ⚑ THE POLICY. Faced with several live controls, which one does a player press?
 * This walker presses the one that CONTINUES, and never the one that leaves.
 * First pattern to match a control's id wins.
 *
 * ⚑ TWO KINDS OF "NOT THIS ONE", and every distinction here cost a failed run.
 * `FORBIDDEN` is never pressed: `r-leave` ends the piece, Restart loops it, and
 * `pause` is a care affordance that toggles rather than advances (run 5 spent
 * half its budget flipping it on and off). All are legitimate for a player and
 * none belongs in a pass whose job is to reach the end.
 *
 * ⚑ `LAST_RESORT` is merely deprioritised, and a plain `leave` belongs here
 * rather than above BECAUSE THE SAME WORD MEANS TWO THINGS. `r-leave` on the
 * OS ends the whole piece; `leave` inside a provotype only closes that app and
 * files it to the ledger as abandoned. The walker needs the second one — it is
 * how a person gets out of a modal they are finished with — so it is pressed,
 * but only once nothing else on the screen is left to try. Several beats also
 * genuinely end on a "Dismiss" or an "Okay".
 *
 * ⚑ AND A SCREEN OFFERING ONLY FORBIDDEN CONTROLS MEANS WAIT, NOT PRESS. The
 * piece opens on exactly that: the descent and the wake are unpressable by
 * design ("the machine boots ITSELF — unconditional, unpressable, the only path
 * in"), and the sole registered control during it is the standing Leave rail.
 * A walker that treats "nothing preferred" as "press whatever is there" quits
 * the piece in its first ten seconds, which is what the first run did.
 */
const PREFER = [
  /understand|continue|^ok$|^okay$|next|read.?on|agree|proceed|begin|start$|enter|hello|open|insert|play|^notification$/i,   // S178: the news outranks a bare Unlock
  /apply|send|confirm|done|finish|accept|update.?now|sign.?in|signin|allow|unlock/i,
  // ⚑ S209 / A25 (REVIEW_ROUND_5, ERA16-16) — 2016's other jobs, worked to their end: the tier below ranked
  //   `board-back` (via /^board/) as high as a job's own controls, so every job but the testimony was opened and
  //   left. Now a job's controls outrank leaving it.
  /^family-sel-|^family-reply-|^family-handle|^group-post$|^story-seg-|^story-publish$|^podcast-publish$|^publish$|^mod:|^price:|^tag:|^preview$|^next:|^c:|^t:|^icon-netvision$/i,
  /^task-|^tile-|^consent|^board|^group$|^inbox$|^link\d*$/i   // S149: `link2`, the vote's card (a fresh id ranked under a spent `task-` for 270 presses)
];
/**
 * ⚑ ANCHORED, AND THE TWO WORDS THAT WERE NOT COST THE WHOLE TAIL (S103).
 *
 * This read `…|restart|…|pause|…` — bare substrings — and the piece names two
 * of its own controls with those words:
 *
 *   · `pause_yes` / `pause_notnow` — THE CAREFUL PAUSE, Era 4's
 *     last real choice. The walker refused all three for an entire run, so it
 *     could never take the pause, never reach the ball behind it, and never see
 *     the glitch, the device returning, the Restart card or the Close. Review
 *     round 1 noticed the refusal; the run this file just made stopped in
 *     exactly that place, 80 rounds of "every control pressed to its cap".
 *   · `close-restart` — THE LAST PRESS IN THE PIECE. The intent behind the word
 *     was "Restart loops it", which is true of the era rituals' own restart and
 *     the exact opposite of this one: the Close's restart is where the work
 *     ENDS. A walker that refuses it can never finish.
 *
 * ⚑ The frame's controls are still refused, by exact id. `^pause$` is the game
 * menu's; `pause_yes` is the era's, and the difference between them is the
 * difference between quitting the piece and playing it.
 */
const FORBIDDEN = /^r-leave$|^pleave$|quit|^exit$|^restart$|decline|^pause$|^mute$|^close-again$|^close-era-|^close-dossier$|^sm-leave$/i;   // S167: close-dossier opens the FRAME's menu, which holds the piece; S219/S220: so does the Start menu's Leave… (with the menu up the look keys are gated, the walk read that as 'turning is broken' and never turned again). Shut Down… is only refused now, so the walk presses it

/** ⚑ see the launch below — order: --chrome, the environment, the platform */
function resolveChrome() {
  const explicit = flag('chrome') ?? process.env.CHROME ?? process.env.CHROME_PATH
    ?? process.env.PUPPETEER_EXECUTABLE_PATH;
  if (typeof explicit === 'string' && explicit) {
    return existsSync(explicit) ? explicit : null;
  }
  const candidates = process.platform === 'darwin' ? [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
  ] : process.platform === 'win32' ? [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ] : [
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium'
  ];
  return candidates.find((c) => existsSync(c)) ?? null;
}
// ⚑ S165: the minimise boxes and the taskbar's window buttons are CHROME — every
//   press of them changes the picture, so a novelty-ranked walker toggled them for
//   a hundred steps (walk of 2026-09-21: 115 presses, three laps of the same three
//   windows, the budget gone in Era 1). They are proved once and otherwise last.
const LAST_RESORT = /^leave$|not.?now|remind|skip|cancel|^back|^dismiss$|^close$|^min-|^taskbar-|^close-src-/i;   // S174: the Close's dossier window pages; never lap it

async function main() {
  if (JUMP && BROKEN_JUMPS[JUMP] && !ALLOW_BROKEN_JUMP) {
    console.error(
      '\nREFUSED: --jump ' + JUMP + ' is a review route that lies.\n\n  ' +
      BROKEN_JUMPS[JUMP] + '\n\n' +
      'Nothing is run, because a run from here would produce a report about the piece that\n' +
      'is really a report about this flag. To watch Era 3 for real, walk to it:\n' +
      '  node tools/walk.mjs --port <port>\n' +
      'To prove the route has been repaired, re-run with --allow-broken-jump and check the\n' +
      'walk does not stop with "THE ROOM DID NOT FOLLOW".\n');
    process.exit(2);
  }
  let puppeteer;
  try {
    puppeteer = (await import(join(ROOT, 'node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js'))).default;
  } catch {
    console.log('puppeteer-core is not installed (optional devDependency) — skipping.');
    process.exit(0);
  }
  mkdirSync(SHOT_DIR, { recursive: true });

  /**
   * ⚑ PORTABLE CHROME (S103d). This was a hardcoded macOS path, so the tool that
   * proves the piece is reachable could itself only be run on one machine — the
   * same defect class it exists to find, one level up. `shots.mjs` already had
   * the answer; this is its `resolveChrome`, verbatim in spirit: an explicit
   * flag, then the environment, then the platform's usual places. Nothing is
   * downloaded and nothing installed; if none is found, say so and skip.
   */
  const chrome = resolveChrome();
  if (!chrome) {
    console.log('no Chrome found — pass --chrome <path> or set $CHROME. Skipping.');
    process.exit(0);
  }
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'],
    defaultViewport: { ...VIEW, deviceScaleFactor: 1 }
  });
  const page = await browser.newPage();

  /**
   * ⚑ SOUND IS ACTIVITY, AND THE WALKER WAS DEAF (review round 1, A-5).
   * The walker's whole notion of "is anything still happening" was a canvas
   * diff. Era 4's tail is 7½ minutes in which the change is very often neither
   * on a canvas nor in the DOM but IN THE AIR: a caption's clip playing out,
   * L's voice running longer than the hold written for it. A deaf walker reads
   * that as a frozen screen, runs out its fourteen stalls in under a minute and
   * files STUCK against a piece that is talking to it. Two walk reports said
   * "stuck at Era 4" partly because of this.
   *
   * So: wrap `Audio` before any of the piece's own script runs, and count both
   * the clips STARTED (a monotonic pulse — a new clip is unambiguous news) and
   * the clips PLAYING RIGHT NOW (so a single long clip still reads as activity
   * for its whole duration). Read-only: the wrapper constructs the real element
   * and hands it back untouched, so the piece cannot tell it is being listened
   * to. Lane A of the review used exactly this to watch the tail.
   */
  /**
   * ⚑ S221 — THE TEXT CENSUS (W1-B1/B2: "too much text"; "an analysis of the quantity of text per surface").
   * Every 2D canvas's fillText is listened to (read-only: the call goes through untouched). A fill or clear
   * that covers the whole canvas starts a new frame for it, so each canvas holds the words of the picture it
   * shows NOW. The walk reads that at every step; the report ranks the screens by words. Canvas text only:
   * the pixel games draw their letters with rects, and DOM chrome (captions, the menu) is not counted.
   */
  await page.evaluateOnNewDocument(() => {
    const per = new Map();
    const wrap = (P) => {
      if (!P) return;
      const ft = P.fillText, fr = P.fillRect, cr = P.clearRect;
      const full = (ctx, x, y, w, h) => {   // in device pixels: the surfaces draw in logical units under a DPR scale
        const c = ctx.canvas, m = ctx.getTransform ? ctx.getTransform() : { a: 1, d: 1, e: 0, f: 0 };
        return x * m.a + m.e <= 0.5 && y * m.d + m.f <= 0.5 && (x + w) * m.a + m.e >= c.width - 0.5 && (y + h) * m.d + m.f >= c.height - 0.5;
      };
      const frame = (ctx) => { per.set(ctx.canvas, []); };
      P.fillText = function (t, ...rest) { const c = this.canvas; let a = per.get(c); if (!a) { a = []; per.set(c, a); } const v = String(t).trim(); if (v && a.length < 600) a.push(v); return ft.call(this, t, ...rest); };
      P.fillRect = function (x, y, w, h) { if (full(this, x, y, w, h)) frame(this); return fr.call(this, x, y, w, h); };
      P.clearRect = function (x, y, w, h) { if (full(this, x, y, w, h)) frame(this); return cr.call(this, x, y, w, h); };
    };
    wrap(window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype);
    wrap(window.OffscreenCanvasRenderingContext2D && OffscreenCanvasRenderingContext2D.prototype);
    window.__textNow = () => [...per.entries()].filter(([, a]) => a.length)
      .map(([c, a]) => ({ size: c.width + 'x' + c.height, text: [...new Set(a)].join(' | ') }));
  });

  await page.evaluateOnNewDocument(() => {
    const w = window;
    const Native = w.Audio;
    if (!Native) return;
    const state = { started: 0, live: [], names: [] };
    const Wrapped = function (...args) {
      const el = new Native(...args);
      // bounded: finished elements are dropped, so a long run cannot grow this
      if (state.live.length > 240) state.live = state.live.filter((a) => !a.paused && !a.ended);
      state.live.push(el);
      const play = el.play.bind(el);
      // ⚑ S141: and WHICH clip, in order — the sound ledger the report prints,
      //   so "is X wired?" is answered by the walk and not by grep
      el.play = function (...a) {
        state.started += 1;
        const name = String(el.src || el.currentSrc || '').split('/').pop();
        if (name && (state.names.length === 0 || state.names[state.names.length - 1] !== name || state.started % 8 === 0)) state.names.push(name);
        return play(...a);
      };
      return el;
    };
    Wrapped.prototype = Native.prototype;
    w.Audio = Wrapped;
    w.__walkAudio = () => {
      const live = state.live.filter((a) => !a.paused && !a.ended && a.currentTime > 0);
      return {
        started: state.started,
        playing: live.length,
        now: live.map((a) => String(a.currentSrc || '').split('/').pop()).join(','),
        names: state.names.slice()
      };
    };
  });

  const noise = [];
  // ⚑ S209 — two runs on 2026-10-02 lost their frame mid-wait (once at the Close, once in 2003) with no navigation
  //   and no crash logged: headless Chrome swapping the page's frame under a pending evaluate. Retry, and say so;
  //   a real reload still shows as PAGE NAVIGATED and a crash as PAGE CRASH.
  {
    const evalOnce = page.evaluate.bind(page);
    page.evaluate = async (...args) => {
      for (let attempt = 0; ; attempt++) {
        try { return await evalOnce(...args); }
        catch (e) {
          if (!/detached Frame/i.test(String(e)) || attempt >= 4) throw e;
          process.stdout.write(`FRAME DETACHED — retry ${attempt + 1}\n`);
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
    };
  }
  page.on('pageerror', (e) => noise.push(`PAGEERROR ${String(e).slice(0, 180)}`));
  // S209 — a page that goes away under the walk says why: a crash or a navigation (the 2026-10-02 run lost its frame at the Close)
  page.on('error', (e) => process.stdout.write(`PAGE CRASH ${String(e).slice(0, 200)}\n`));
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) process.stdout.write(`PAGE NAVIGATED ${f.url()}\n`); });
  page.on('console', (m) => {
    const t = m.text();
    if (/ASSERT|Invalid batch|Uncaught|TypeError/i.test(t)) noise.push(t.slice(0, 180));
  });

  const log = [];
  const note = (kind, detail) => {
    log.push({ step: log.length, kind, t: Date.now(), ...detail });
    const d = detail.target ?? detail.what ?? '';
    console.log(
      `${String(log.length).padStart(3)} ${kind.padEnd(10)} ${String(d).slice(0, 40).padEnd(40)} ` +
      `${(detail.era ?? '').padEnd(3)} ${(detail.phase ?? '').padEnd(9)} ${detail.qMode ?? ''}`
    );
  };

  await page.goto(`http://localhost:${PORT}/?reinterp=1&debug=1`, { waitUntil: 'networkidle2', timeout: 60000 });
  note('open', { what: '?reinterp=1&debug=1 — debug is READ-ONLY here; no panel button, no jump, no __requestMove' });

  // ── the front door is real DOM, not canvas (4 s ethics delay honoured) ──
  await page.waitForFunction(
    () => [...document.querySelectorAll('button')].some((b) => /Log in/i.test(b.textContent || '') && !b.disabled),
    { timeout: 45000 });
  await page.$$eval('button', (bs) => {
    const b = bs.find((x) => /Log in/i.test(x.textContent || ''));
    if (b) b.click();
  });
  note('dom', { target: 'Log in', what: 'the content-warning panel (real DOM button)' });
  await page.waitForFunction(() => !!window.__os && !!window.__app, { timeout: 45000 });
  await wait(7000);

  if (JUMP) {
    await page.evaluate((b) => window.__os.debugJump(b), JUMP);
    await wait(5000);
    note('JUMPED', {
      what: 'debugJump("' + JUMP + '") — DIAGNOSTIC ONLY. This run proves nothing about ' +
        'whether a player can reach this beat; everything after this point is still ' +
        'ordinary clicking, but the way in was a crutch.'
    });
  }

  /**
   * ⚑ ONE READ PER STEP, and it does the projection in-page.
   * Every pressable thing in the piece comes back with a page point already
   * computed, so the walker never has to know which mesh a surface is on.
   */
  const probe = () => page.evaluate(({ VW, VH }) => {
    const os = window.__os;
    const app = window.__app;
    const q = window.__graceQueue ? window.__graceQueue() : null;
    const pose = window.__camPose ? window.__camPose() : null;
    const root = app.root;
    let cam = null;
    root.forEach((e) => { if (e.camera && e.enabled) cam = e; });
    const Vec3 = root.getPosition().constructor;

    // ⚑ WHY, NOT JUST WHETHER. "no controls" and "controls I cannot aim at" are
    // completely different findings — the first is a hole in the piece, the
    // second is a hole in this tool — and a log that conflates them is worth
    // nothing. Every rejection carries its reason from here on.
    let lastWhy = '';
    /**
     * ⚑ THE WORLD POINT IS KEPT EVEN WHEN THE PROJECTION FAILS (2026-09-11).
     * Until now a control that landed outside the frame was recorded as a
     * reason and nothing else — "off-screen at 1442,310" — which is a
     * description of where the CAMERA happens to be pointing, not a fact about
     * the piece. The player's answer to that sentence is to turn their head,
     * and the walker had no way to say it. Keeping the world point means every
     * rejection can also carry HOW FAR ROUND the thing is, and a turn of 20° to
     * something in your own room is then plainly different from 150° to a
     * machine in a room you left.
     */
    let lastWorld = null;
    const toPage = (wx, wy, wz) => {
      lastWorld = [wx, wy, wz];
      const p = cam.camera.worldToScreen(new Vec3(wx, wy, wz));
      if (p.z <= 0) { lastWhy = 'behind the camera'; return null; }
      if (p.x < 4 || p.y < 4 || p.x > VW - 4 || p.y > VH - 4) {
        lastWhy = 'off-screen at ' + Math.round(p.x) + ',' + Math.round(p.y);
        return null;
      }
      /**
       * ⚑ AND IS ANYTHING SITTING ON TOP OF IT? (2026-09-04, S117.) A control
       * can be in frame, correctly projected, and still unpressable because a
       * piece of FRAME CHROME is over it — the DOM takes the pointer and the
       * canvas never hears about it. That is not a hypothetical: Era 4's one
       * touch, the headset, projected to (138, 811) and the "Look with your
       * device" button occupied [14, 726]–[192, 754]. They cleared each other
       * by 57 px until the Room 3 seat moved 3° and did not, and the piece then
       * had no ending — a walk that stopped at 197 presses with every check
       * green.
       *
       * `elementFromPoint` returns the topmost HIT-TESTABLE element, so the
       * build's `pointer-events: none` hints and washes are skipped for free and
       * only chrome that would really eat the press is reported. Naming the
       * element matters more than the count: "covered by BUTTON 'Look with your
       * device'" is a fix, "unreachable" is a mystery.
       */
      const el = document.elementFromPoint(p.x, p.y);
      if (el && el.tagName !== 'CANVAS') {
        const label = (el.textContent || '').trim().slice(0, 28);
        lastWhy = 'covered by ' + el.tagName + (label ? ' "' + label + '"' : '')
          + ' at ' + Math.round(p.x) + ',' + Math.round(p.y);
        return null;
      }
      return [p.x, p.y];
    };

    /** the exact inverse of era3Devices.ts's hitPlane(), for any oriented plane */
    const onPlane = (entName, lx, ly, LW, LH) => {
      const ent = root.findByName(entName);
      lastWorld = null;   // an early exit below must not leave a stale point
      if (!ent) { lastWhy = 'no entity ' + entName; return null; }
      let n = ent;
      while (n) { if (!n.enabled) { lastWhy = entName + ' is disabled'; return null; } n = n.parent; }
      const m = ent.getWorldTransform().data;
      const u = lx / LW - 0.5;          // hitPlane: u = lx/w + 0.5
      const v = ly / LH - 0.5;          // hitPlane: v = 0.5 + lz/h  -> same sign
      return toPage(
        m[12] + u * m[0] + v * m[8],
        m[13] + u * m[1] + v * m[9],
        m[14] + u * m[2] + v * m[10]
      );
    };

    /** Room 1's monitor is axis-aligned and hardcoded in app.ts's toDesktop() */
    const SCREEN = { w: 0.4, h: 0.3, x: 0, y: 1.08, z: 0 };
    const onMonitor = (lx, ly, LW, LH) => toPage(
      SCREEN.x + (lx / LW - 0.5) * SCREEN.w,
      SCREEN.y - (ly / LH - 0.5) * SCREEN.h,   // toDesktop: v = 0.5 - (wy-y)/h
      SCREEN.z
    );

    const OS = { w: 512, h: 384 };
    /** ⚑ Room 3's docked monitor is widescreen — LOGICAL.monitor in era3Devices.ts */
    const MON = { w: 710, h: 384 };
    const WS = { w: 676, h: 390 };
    const PH = { w: 180, h: 360 };
/** ⚑ Era 4's laptop lid, kept in step with LOGICAL.laptop in era3Devices.ts */
const LAP = { w: 224, h: 140 };
    const RITUAL = { x: Math.round((WS.w - OS.w) / 2), y: Math.round((WS.h - OS.h) / 2) };

    /**
     * ⚑ THE SAME CANVAS, THREE DIFFERENT MESHES, AND THE ERA DECIDES WHICH.
     * `DesktopOS.canvas` is textured onto Room 1's monitor in Eras 1-2, onto
     * Room 2's workstation for Era 3's update ritual (inset by RITUAL_OFFSET,
     * exactly as era3Devices.ts composites it), and onto the visor in Era 4.
     * Trying them in a fixed order is wrong once more than one is in frame at
     * a time: from Room 3's seat the older rooms are still there, so a chain
     * that asks the monitor first aims Era 4's controls at a screen two rooms
     * away. Ask the era first, and keep the others only as a fallback.
     */
    const osPoint = (lx, ly) => {
      const monitor = () => onMonitor(lx, ly, OS.w, OS.h);
      /**
       * ⚑ ROOM 3's DOCKED MONITOR — the fourth screen, and this chain did not
       * know it existed (2026-09-11). S126 put Era 4's browser on it and
       * `19150de` made its six tabs the playable content of the era; this list
       * still read [visor, workstation, Room 1's monitor], so every tab rect was
       * aimed at the HEADSET'S FACE — where a press means `wear()`. The era's
       * opening press therefore filed `headset:worn` instead of opening a tab,
       * and four days of walks called that a browser being read.
       *
       * This is the note three comments above this one, come true a second time:
       * "do not keep a hand-written copy of the architecture… it would go stale
       * the first time somebody adds a screen." Somebody added a screen.
       */
      const desk = () => onPlane('era3-device-monitor', lx, ly, MON.w, MON.h);
      const visor = () => onPlane('era4-visor', lx, ly, OS.w, OS.h);
      const workstation = () => onPlane('era3-device-workstation',
        lx + RITUAL.x, ly + RITUAL.y, WS.w, WS.h);
      /**
       * ⚑ AND IN e4 THE ORDER FOLLOWS THE DEVICE. Off the face, the browser is
       * on the desk and the desk is what she presses; on the face, the picture
       * IS the frame and everything goes to it. Asking the visor first either
       * way is how the browser stage was skipped entirely.
       */
      const worn = !!(os.e4 && os.e4.worn);
      const order = os.desktopEra === 'e4'
        ? (worn ? [visor, desk, workstation, monitor] : [desk, visor, workstation, monitor])
        : os.desktopEra === 'e3' ? [workstation, visor, monitor]
        : [monitor, workstation, visor];
      /**
       * ⚑ AND IT REPORTS THE FIRST SURFACE'S POSITION, NOT THE LAST ONE TRIED.
       * The chain asks the era's own screen first and falls back through the
       * others, so on a miss `lastWorld` would otherwise hold Room 1's monitor
       * — two rooms behind you — and a walker turning toward it would spin away
       * from the era it is in to face a dead machine. The era's own screen is
       * the one worth turning to.
       */
      let firstWorld = null, firstWhy = '';
      for (const f of order) {
        lastWorld = null;
        const p = f();
        if (p) return p;
        if (!firstWorld && lastWorld) { firstWorld = lastWorld; firstWhy = lastWhy; }
      }
      if (firstWorld) { lastWorld = firstWorld; lastWhy = firstWhy; }
      return null;
    };

    /**
     * ⚑ HOW FAR ROUND IS IT? — the number that lets the walker turn its head.
     *
     * The piece's own camera convention is `setLocalEulerAngles(pitch, yaw, 0)`
     * on the rig, so forward is `(-sin yaw, sin pitch, -cos yaw)`; the yaw that
     * faces a world point is therefore `atan2(-dx, -dz)` and the pitch is the
     * elevation of the same vector. The pose to measure against is the SUM of
     * the authored facing and the player's own look — `__camPose` reports those
     * two separately on purpose (S85: folding a hand-drag into the curve's pose
     * would make the comfort audit report a wrist as leg velocity), and for
     * this question the sum is what the eyes are actually doing.
     *
     * `dist` comes back too, because it is how "behind me, in the room I left"
     * is told from "behind me, on this desk".
     */
    const turnTo = (w) => {
      if (!w || !pose) return null;
      const c = cam.getPosition();
      const dx = w[0] - c.x, dy = w[1] - c.y, dz = w[2] - c.z;
      const flat = Math.hypot(dx, dz);
      const R = 180 / Math.PI;
      const wantYaw = Math.atan2(-dx, -dz) * R;
      const wantPitch = Math.atan2(dy, flat) * R;
      const nowYaw = pose.yaw + (pose.lookYaw || 0);
      const nowPitch = pose.pitch + (pose.lookPitch || 0);
      return {
        yaw: Math.round((((wantYaw - nowYaw) + 540) % 360 - 180) * 10) / 10,
        pitch: Math.round((wantPitch - nowPitch) * 10) / 10,
        dist: Math.round(Math.hypot(flat, dy) * 100) / 100
      };
    };

    const targets = [];
    const dropped = [];
    const add = (id, surface, r, pt) => {
      const logical = [Math.round(r.x + r.w / 2), Math.round(r.y + r.h / 2)];
      if (pt) targets.push({ id, surface, logical, pt });
      else dropped.push({
        id, surface, logical, why: lastWhy || 'unprojectable', turn: turnTo(lastWorld)
      });
    };

    /**
     * ⚑ FIND THE SURFACES BY LOOKING, NOT BY LISTING THEM.
     * The OS is not the only thing that owns hit rects. Every modal sub-app —
     * the provotype, the diary, IRC, the kit, Restorify, Netvision, the packet
     * — keeps its OWN `hits` array and draws into the SAME OS canvas, and while
     * one is open `os.handleClick` delegates to it wholesale, so `os.hits` is
     * legitimately empty. A walker that reads only `os.hits` sees a screen full
     * of buttons and reports "nothing to press", which is exactly what the
     * third run of this tool did in front of a dialog captioned "Begin".
     *
     * So this walks the object graph instead of naming the apps. A hardcoded
     * list of sub-apps would be a second copy of the architecture, and it would
     * go stale the first time somebody adds a screen — which is the precise
     * failure mode this whole tool exists to catch. Anything holding an array
     * of {x,y,w,h,id} is a surface, whatever it is called and whenever it was
     * added.
     */
    // ⚑ NOT EVERY SURFACE CALLS IT `hits`. IRC keeps its answers in `replyRects`,
    // and a matcher that only knew the two commonest names reported IRC as a
    // surface publishing nothing — which was wrong, and which I had already
    // told Sérgio. Match the shape of the NAME, not a list of names.
    // Declared out here because the structural silent/quiet test below uses it too.
    const RECTS_KEY = /(^|[a-z])(hits?|rects?)$/i;
    const looksLikeRects = (v) => Array.isArray(v) && v.length > 0 && v.every((r) =>
      r && typeof r === 'object' &&
      typeof r.x === 'number' && typeof r.y === 'number' &&
      typeof r.w === 'number' && typeof r.h === 'number' && typeof r.id === 'string');
    const collect = (rootObj, maxDepth) => {
      const found = [];
      const seen = new Set();
      const visit = (obj, depth, path) => {
        if (!obj || typeof obj !== 'object' || depth > maxDepth || seen.has(obj)) return;
        seen.add(obj);
        if (seen.size > 400) return;
        // a sub-app that says it is closed owns nothing on screen
        if (path && (obj.open === false || obj.visible === false)) return;
        for (const k of Object.keys(obj)) {
          let v;
          try { v = obj[k]; } catch { continue; }
          if (RECTS_KEY.test(k) && looksLikeRects(v)) {
            found.push({ path: path || 'os', rects: v });
          } else if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Element)) {
            visit(v, depth + 1, path ? path + '.' + k : k);
          }
        }
      };
      visit(rootObj, 0, '');
      return found;
    };

    const osGroups = collect(os, 3);
    const surfaces = osGroups.map((g) => g.path + '(' + g.rects.length + ')');
    for (const grp of osGroups)
      for (const h of grp.rects)
        add(h.id, grp.path === 'os' ? 'os' : grp.path, h, osPoint(h.x + h.w / 2, h.y + h.h / 2));
    /**
     * ⚑ TWO VERY DIFFERENT THINGS, AND I CONFLATED THEM ONCE ALREADY.
     *
     * A surface with no rects RIGHT NOW is usually just quiet: `caleb`,
     * `netvision`, `accountability` and L's voice all register their controls
     * only in the phase that offers them, so between beats they are legitimately
     * empty. That is the piece working.
     *
     * A surface with NO RECT FIELD AT ALL is the real problem: it computes its
     * button geometry inline inside `handleClick`, so the geometry exists twice
     * and nothing can check the copies agree. `kit` and `updateApp` were both
     * such surfaces until 2026-08-28, and the kit's two copies HAD drifted, by
     * 40 px. Both now register while drawing; this test stays because the next
     * such surface will not announce itself either.
     *
     * The first report from this tool called all six silent and was wrong about
     * four of them. So the test is now structural — does the object own a
     * rect-shaped field at all? — and the two states are named differently.
     */
    const silent = [];
    const quiet = [];
    for (const k of Object.keys(os)) {
      let v; try { v = os[k]; } catch { continue; }
      // ⚑ `press` as well as `handleClick`: the diary takes ANY click on the
      //   whole screen and has no coordinates and no rects at all, so a detector
      //   looking only for `handleClick` walked straight past it — and then
      //   pressed desktop icons the diary was silently swallowing.
      if (!v || typeof v !== 'object' || v.open !== true) continue;
      if (typeof v.handleClick !== 'function' && typeof v.press !== 'function') continue;
      if (osGroups.some((g) => g.path === k || g.path.indexOf(k + '.') === 0)) continue;
      /**
       * ⚑ A THIRD STATE, AND IT SWALLOWED A WHOLE ERA. IRC keeps `replyRects`,
       * so the structural test above called it healthy — but those rects carried
       * no `id`, so `looksLikeRects` refused them and nothing was collected
       * either. Not collected, and not swept because it "had a rect field": the
       * walker went blind in front of the IRC exchange and never left Era 1.
       * A populated rect field that yields nothing aimable is its own defect and
       * is treated as silent, so this gap cannot quietly eat a surface again.
       */
      const fields = Object.keys(v).filter((kk) => RECTS_KEY.test(kk) && Array.isArray(v[kk]));
      const populated = fields.filter((kk) => v[kk].length > 0);
      if (!fields.length) silent.push(k);
      else if (populated.length && !populated.some((kk) => looksLikeRects(v[kk]))) silent.push(k);
      else quiet.push(k);
    }

    if (q) {
      // the workstation's own canvas, and every sub-surface drawn into it
      for (const grp of collect(q, 3)) {
        const onPhone = grp.path === 'phone' || grp.path.indexOf('phone.') === 0;
        for (const r of grp.rects) {
          if (onPhone) {
            add(r.id, 'phone', r,
              onPlane('era3-device-phone', r.x + r.w / 2, r.y + r.h / 2, PH.w, PH.h));
          } else {
            add(r.id, grp.path === 'os' ? 'workstation' : 'workstation:' + grp.path, r,
              onPlane('era3-device-workstation', r.x + r.w / 2, r.y + r.h / 2, WS.w, WS.h));
          }
        }
      }
    }

    /**
     * ⚑ A SCREEN THAT PUBLISHES NOTHING IS ITSELF THE BUTTON, and the walker had
     * no way to press one. Era 4 now opens on Maya's laptop: a screen plane in
     * the room, drawn by the shell, with no hit rects of its own — you press the
     * machine, not a control on it. The same is true of the phone (picked up,
     * not squinted at) and of the visor. The OS canvas has the sweep for this
     * case; a plane in the room had nothing, so the walk stalled in front of a
     * laptop it could see and could not touch.
     *
     * So: any live screen plane that contributed no rects this frame is offered
     * as a press at its own centre. Discovered from the scene graph rather than
     * listed, for the same reason the rect search is.
     */
    /**
     * ⚑ THE LAPTOP PUBLISHES RECTS NOW, AND THE LAST PRESS IN THE PIECE IS ONE
     * OF THEM (S103c). The block above offers a rect-less plane as a press at
     * its own CENTRE, which is right for "you press the machine, not a control
     * on it" — and wrong the moment the machine grows a control. After Era 4's
     * hand-off the lid carries the Close's card with a single `Restart` at its
     * bottom-right, so a centre press lands on empty screen forever: measured,
     * four full runs, each stopping ~90 steps after the finale had already been
     * handed over. Same shape as the workstation's own rects, same helper.
     */
    const e4 = os && os.e4;
    const program = !!(e4 && e4.browser && e4.browser.programMode && e4.browser.programMode !== 'free');
    const lapRects = e4 && Array.isArray(e4.laptopHits) ? e4.laptopHits : [];
    for (const r of lapRects) {
      add(r.id, 'laptop', r, onPlane('era3-device-laptop', r.x + r.w / 2, r.y + r.h / 2, LAP.w, LAP.h));
    }
    /**
     * ⚑ DANIEL'S MONITOR IN THE CLOSE (2026-09-12, Phase D). The Restart card
     * on the 1997 CRT, lit after the constellation settles: its rects are
     * published on `__closeMonitor.hits` and the glass is Room 1's own screen
     * pose (`onMonitor`). They are listed so the map shows the piece's last
     * surface as aimable — and they are FORBIDDEN to press: `close-again`
     * reloads the page and the era buttons leave the Close, and the walk's
     * job ends at `spine: done`, not at starting the piece over.
     */
    const cm = window.__closeMonitor;
    const cmRects = cm && cm.on && Array.isArray(cm.hits) ? cm.hits : [];
    // ⚑ S163 / C-02: the machine stands back in the sky at its own pose (`glass`,
    //   world centre + size), no longer on Room 1's screen; `close-go` (the far
    //   face's one press) is allowed — it only brings the eye to the card
    const g = cm && cm.glass ? cm.glass : null;
    for (const r of cmRects) {
      const pt = g
        ? toPage(g.x + (r.x + r.w / 2) / OS.w * g.w - g.w / 2, g.y - ((r.y + r.h / 2) / OS.h - 0.5) * g.h, g.z)
        : onMonitor(r.x + r.w / 2, r.y + r.h / 2, OS.w, OS.h);
      add(r.id, 'close-monitor', r, pt);
    }
    /**
     * ⚑ S177 / R4-30 — THE PANELS' SOURCES BUTTONS. Each panel's story face carries an
     * era-styled button (his D3); `__closePanels()` publishes its world point while the
     * face shows (null once the panel has turned to its dossier). Named `close-src-*`,
     * so LAST_RESORT presses each once and never laps them.
     */
    const cps = cm && cm.on && typeof window.__closePanels === 'function' ? window.__closePanels() : [];
    for (const p of cps) {
      if (!p.button || p.hidden) continue;
      const pt = toPage(p.button.x, p.button.y, p.button.z);
      if (pt) targets.push({ id: 'close-src-e' + p.era, surface: 'panel', logical: null, pt });
      else dropped.push({ id: 'close-src-e' + p.era, surface: 'panel', logical: null, why: lastWhy || 'unprojectable', turn: turnTo(lastWorld) });
    }

    const surfaced = new Set(targets.map((t) => t.surface));
    root.forEach((e) => {
      const n = e.name || '';
      if (!/^era3-device-|^era4-visor$/.test(n)) return;
      let p2 = e; let on = true;
      while (p2) { if (!p2.enabled) { on = false; break; } p2 = p2.parent; }
      if (!on) return;
      const key = n.replace('era3-device-', '');
      if (surfaced.has(key) || surfaced.has('workstation:' + key)) return;
      const c = e.getPosition();
      const pt = toPage(c.x, c.y, c.z);
      /**
       * ⚑ AND A PLANE THAT CANNOT BE AIMED AT IS NOW A FINDING, NOT A SILENCE.
       * This branch used to drop the press on the floor when the projection
       * failed, so Era 4's headset — a machine you press, with no control on it
       * — simply ceased to exist the moment it sat off-axis. That silence is
       * the whole reason the headset was pulled back to 20.6° off the seat
       * bearing instead of into the periphery Sérgio asked for: the tool could
       * not see it there, and the piece was bent to fit the tool.
       */
      if (pt) targets.push({ id: '(press) ' + key, surface: 'plane', logical: null, pt });
      else dropped.push({
        id: '(press) ' + key, surface: 'plane', logical: null,
        why: lastWhy || 'unprojectable', turn: turnTo(lastWorld)
      });
    });

    // floor markers — the only non-scripted way to change seats
    const moves = [];
    for (const id of (window.__movementNodes ? window.__movementNodes() : [])) {
      const e = root.findByName('node-' + id);
      if (!e || !e.enabled) continue;
      const c = e.getPosition();
      const pt = toPage(c.x, c.y + 0.05, c.z);
      if (pt) moves.push({ id: '(move) ' + id, surface: 'marker', logical: null, pt });
    }

    /**
     * ⚑ DID THE ROOM FOLLOW THE DESKTOP? (A-5.2, the general case.)
     * The named refusal above stops the one broken jump we know about. This is
     * the net under it, and two wrong versions of it are worth recording because
     * both looked obviously right:
     *
     *  · **"can the era's screen be aimed at?"** — the jumped run sailed past
     *    it. The three rooms are ONE SPACE THAT AGES, not three places, so from
     *    the first chair the Era-3 workstation is perfectly visible: small, dark
     *    and inert, but on screen. Visible is not seated.
     *  · **"is the camera nearer Room 1's monitor than the era's own screen?"**
     *    — same reason. The machines occupy nearly the same corner of the same
     *    room across thirty years; there is no distance to measure.
     *
     * What actually differs is the MACHINE'S OWN STATE, and the piece publishes
     * it. Era 3's workstation wakes through `beginArrival`/`settleArrival`,
     * which app.ts calls on the real e2→e3 leg and an OS-only jump never
     * reaches — so the queue sits in `dark` for ever, publishing no rects, while
     * the desktop insists it is Era 3. On the played path the queue leaves
     * `dark` within seconds of the era landing. That is the difference between
     * an era you are in and an era you were dropped beside.
     */
    let roomDesync = null;
    if (os.desktopEra === 'e3' && q && q.mode === 'dark') {
      roomDesync = 'the desktop is at e3 but the workstation queue is still `dark` — the ' +
        'machine was never woken, so it publishes nothing and no press on it can land';
    }

    /**
     * ⚑ THE SCREEN'S IDENTITY IS WHAT IS DRAWN ON IT, not the set of buttons.
     * Run 6 proved why: a provotype's "invitation" and "frame" screens carry
     * the SAME three controls at the SAME coordinates in the same phase, so a
     * signature built from control ids collapsed two different screens into
     * one — and the walker, believing it had already pressed Continue here,
     * pressed Leave instead and abandoned the app on its second page. Every
     * time. A coarse hash of the canvas itself tells them apart, which is all
     * the memory needs to stop confusing one page of a story for another.
     */
    const hashOf = (c) => {
      if (!c || !c.width) return '';
      // ⚑ 48x36, not 24x18. At the coarser size a selected profile chip — a few
      //   pixels of highlight on a 512x384 canvas — averaged away to nothing, so
      //   legitimate selections were being judged inert. Fine enough to see a
      //   chip, coarse enough to ignore a caret blinking.
      const t = document.createElement('canvas');
      t.width = 48; t.height = 36;
      const tx = t.getContext('2d');
      tx.drawImage(c, 0, 0, 48, 36);
      const d = tx.getImageData(0, 0, 48, 36).data;
      let h = 2166136261;
      for (let i = 0; i < d.length; i += 4)
        h = Math.imul(h ^ (d[i] + d[i + 1] * 3 + d[i + 2] * 7), 16777619) >>> 0;
      return h.toString(36);
    };
    /**
     * ⚑ EVERY DEVICE SCREEN, NOT THE THREE I HAPPENED TO REMEMBER (A-5.1).
     * This hash used to name `workstation` and `phone` by hand — and Era 4
     * opens on a FOURTH, Maya's laptop, added in S97. So the era's first three
     * presses, whose entire visible effect is one line of L's arriving on that
     * lid, changed nothing this walker could see: the press was marked inert on
     * the spot, never repeated, and `laptop:read` was never filed. Two walk
     * reports concluded Era 4 had no door.
     *
     * The lesson is the one this whole tool keeps re-learning: do not keep a
     * hand-written copy of the architecture. `debugCanvases()` returns every
     * screen the room owns, keyed by name; hash all of them, in a stable order,
     * and the next surface somebody adds is hashed the day it appears.
     */
    const canvases = window.__era3Devices ? window.__era3Devices() : {};
    // ⚑ S177: and the Close's four panels — a Sources press turns a panel to its dossier
    //   on the panel atlas, which no canvas above holds; its face index is the change
    const panelFaces = typeof window.__closePanels === 'function'
      ? 'panels:' + window.__closePanels().map((p) => p.face).join(',') : '';
    const screenHash = hashOf(os.canvas) + '/' +
      Object.keys(canvases).sort().map((k) => k + ':' + hashOf(canvases[k])).join('/') + '/' + panelFaces;

    /**
     * ⚑ AND SOME OF THIS PIECE DOES NOT SPEAK IN PIXELS AT ALL (A-5.3).
     * The ball's 46 lines are a DOM caption strip (`ball.ts`'s own header says
     * so, and calls it a gap for the headset). Three and a half minutes of the
     * piece's one respite therefore move no canvas whatsoever. Read the overlay
     * text as well, so a caption arriving counts as the piece speaking.
     */
    const domText = [...document.querySelectorAll('[id^="reinterp-"]')]
      .filter((el) => el.id !== 'reinterp-game-menu' && el.id !== 'reinterp-menu-glyph')
      .map((el) => el.id + '=' + (el.textContent || '').trim().slice(0, 120))
      .join('|');

    const audio = window.__walkAudio ? window.__walkAudio() : { started: 0, playing: 0, now: '' };

    const led = window.__ledger ? window.__ledger() : null;
    const ledCount = led ? Object.keys(led).reduce(
      (n, k) => n + (Array.isArray(led[k]) ? led[k].length : 0), 0) : 0;
    /**
     * ⚑ WHAT WAS FILED, NOT MERELY HOW MANY. A count told the report that a
     * press moved the ledger; it could never say `laptop:read`, which is the
     * only thing that proves Era 4's opening actually completed. Names cost
     * nothing and they are what the map is for.
     */
    const ledList = [];
    if (led) {
      for (const k of Object.keys(led)) {
        const v = led[k];
        if (!Array.isArray(v)) continue;
        v.forEach((e, i) => ledList.push(k + ':' + (
          typeof e === 'string' ? e
            : (e && e.id ? e.id + (e.outcome ? ':' + e.outcome : '') : '#' + i))));
      }
    }

    return {
      phase: os.phase, era: os.desktopEra,
      spine: window.__spine ? window.__spine().step : null,
      driven: !!(pose && pose.driven),
      qMode: q ? q.mode : null,
      ritualOpen: !!(os.updateApp && os.updateApp.visible),
      rawOsHits: (os.hits || []).length,
      screenHash, domText, audio, surfaces, silent, quiet, roomDesync, pose, program,
      targets, dropped, moves, ledCount, ledList, ledger: led,
      // S178: the phone is in her hand (app.ts carries a copy of its body while it is)
      phoneHeld: !!(window.__app && window.__app.root.findByName('w_phoneDevice-held')?.enabled)
    };
  }, { VW: VIEW.width, VH: VIEW.height });

  /** ⚑ a real press: down, hold, up — the piece resolves the tap on RELEASE */
  const doPress = async (pt, settle = 1200) => {
    await page.mouse.move(pt[0], pt[1]);
    await page.mouse.down();
    await wait(70);
    await page.mouse.up();
    await wait(settle);
  };

  const moved = (a, b) =>
    a.phase !== b.phase || a.era !== b.era || a.qMode !== b.qMode ||
    a.spine !== b.spine || a.ledCount !== b.ledCount ||
    a.targets.length !== b.targets.length ||
    a.targets.map((t) => t.id).join() !== b.targets.map((t) => t.id).join();

  /**
   * ⚑ THE PULSE — "is the piece doing anything at all", on all three of its
   * channels. Until review round 1 this was one channel, the drawn pixels, and
   * the two it was missing are exactly the two Era 4's tail runs on: a DOM
   * caption (the ball's 46 lines) and a clip playing (L, and every voiced hold
   * that outlasts its written one). A walker with one ear and one eye called a
   * talking piece frozen.
   *
   * ⚑ Deliberately NOT used by `moved()`, and the distinction matters. `moved`
   * decides whether a PRESS did something, and the sweep leans on it to decide
   * that a blind point on the canvas was a button; if ambient sound counted
   * there, the sweep would "find" a control wherever a clip happened to start.
   * The pulse answers a different and softer question — whether to keep
   * waiting — and being generous is the right failure direction for that one.
   */
  const pulseOf = (st) =>
    st.screenHash + ' \u241F ' + st.domText + ' \u241F ' +
    st.audio.started + ' \u241F ' + (st.audio.playing > 0 ? 'A' : '-');

  /** what arrived in the ledger between two probes, by name */
  const ledgerNew = (before, after) => {
    const had = new Map();
    for (const e of before.ledList) had.set(e, (had.get(e) || 0) + 1);
    const out = [];
    for (const e of after.ledList) {
      const n = had.get(e) || 0;
      if (n > 0) had.set(e, n - 1); else out.push(e);
    }
    return out;
  };

  const press = async (t, before) => {
    await doPress(t.pt);
    const after = await probe();
    note('press', {
      target: t.id, surface: t.surface, logical: t.logical,
      page: [Math.round(t.pt[0]), Math.round(t.pt[1])],
      era: after.era, phase: after.phase, spine: after.spine, qMode: after.qMode,
      ledgerDelta: after.ledCount - before.ledCount,
      ledgerNew: ledgerNew(before, after),
      changed: moved(before, after),
      // S149 — what the walker could aim at AFTER this press (the JSON log only): the
      //   question "why was X never pressed" was unanswerable without it
      live: (after.targets || []).map((t) => t.surface + ':' + t.id).slice(0, 40),
      unreachable: (after.dropped || []).map((d) => d.surface + ':' + d.id + ' — ' + d.why).slice(0, 12)
    });
    return after;
  };

  /**
   * ⚑ TURN YOUR HEAD (2026-09-11) — and it is embarrassing that this took until
   * now, because the turn is THE BODILY ASK OF THIS PIECE. "No locomotion ever
   * — the only bodily ask is the turn", says CLAUDE.md; R28 says "rotation IS
   * the exploration". Every version of this walker until this one sat rigidly
   * facing the authored bearing and reported anything off-axis as unreachable.
   *
   * ⚑ WHAT THAT COST, and it is not hypothetical. Era 4's headset was supposed
   * to sit in the periphery — Sérgio, twice: "push the headset more to the side
   * so the person can see in their peripheral view without being centered on
   * stage". It sits at 20.6° off the seat bearing instead, because that is as
   * far out as this tool could still see it, and the field-of-view audit in
   * `edebea7` had ALREADY proved a player reaches everything by turning (36
   * bearings x 6 pitches, all four eras, nothing blocked). So the piece was bent
   * to fit the instrument. His standing instruction covers exactly this: "if you
   * hard setting forcing you that just remove it".
   *
   * ⚑ IT TURNS THE WAY A PLAYER TURNS. `app.ts`'s reinterp key block moves the
   * view 6° of yaw per ArrowLeft/Right and 5° of pitch per ArrowUp/Down —
   * look-in-place only, never a seat change ("the ONLY way to change seats is
   * requestMove (markers) or a scripted beat"). A drag would do the same job
   * through `lookOffYaw`, at 0.16°/px, and was rejected for one reason: the
   * press law resolves a tap on RELEASE behind a 10 px threshold, so a drag
   * that ends short is a CLICK, and a look-around that occasionally presses
   * whatever it lands on is not an instrument. Keys cannot be mistaken for a
   * tap. Both are real player input; neither is a debug write. `__camFree`
   * exists and would have been one line — it is the same crutch as `debugJump`
   * and is not used here for the same reason.
   *
   * ⚑ AND IT ONLY TURNS TO THINGS THAT ARE PLAUSIBLY IN THIS ROOM. The three
   * rooms are one space that ages, so a machine two eras back is still in the
   * scene, still publishing rects, and still perfectly "turnable to" at 150°.
   * Facing it would spin the walk out of the era it is in. The cap is what
   * separates a glance at your own desk from turning your back on the piece.
   */
  const TURN_YAW_MAX = 80;      // beyond this you are facing another room
  const TURN_PITCH_MAX = 45;    // app.ts clamps the view itself at 55
  const YAW_STEP = 6;           // app.ts: ArrowLeft/Right move camYaw by 6°
  const PITCH_STEP = 5;         // app.ts: ArrowUp/Down move camPitch by 5°
  /** set false the first time the keys demonstrably do not move the view */
  let headWorks = true;
  /** one turn per (coarse state, control) — cleared by any genuine advance */
  const turnedFor = new Set();
  /** every turn taken, for the report */
  const turns = [];
  /**
   * ⚑ LOOK, THEN TOUCH. A turn that found its target must be followed by a
   * PRESS, not by another turn — and the first version of this was not, because
   * the trigger it uses ("twelve presses that changed nothing") is still true on
   * the very next step. Measured: the walker turned 41.6° to face the headset,
   * reported it in frame, and swung 42° straight back to the monitor without
   * ever touching it, then read the same tabs until the run died. One step of
   * grace is all it needs: having turned, try what is now in front of you.
   */
  let justTurned = false;

  const tapKey = async (k, n) => {
    for (let i = 0; i < n; i++) { await page.keyboard.press(k); await wait(45); }
  };
  const turnBy = async (yawSteps, pitchSteps) => {
    if (yawSteps) await tapKey(yawSteps > 0 ? 'ArrowLeft' : 'ArrowRight', Math.abs(yawSteps));
    if (pitchSteps) await tapKey(pitchSteps > 0 ? 'ArrowUp' : 'ArrowDown', Math.abs(pitchSteps));
    await wait(420);
  };

  /**
   * ⚑ WHICH WAY DO YOU LOOK FIRST? The smallest turn. A person facing a screen
   * and finding nothing on it glances to the nearest thing, not to the most
   * interesting one — and in Era 4 that ordering is exactly right: the headset
   * on this desk beats the workstation behind you by fifty degrees.
   */
  // ⚑ S150 — with NOTHING aimable at all, the cap is the whole circle: a summons
  //   accepted (`send-go`) dollies the view to another room's bearing and leaves
  //   the monitor 90°+ behind, which is exactly when a person turns right round.
  //   The 80° cap still holds whenever something is in front of the walker.
  const turnable = (st, sig) => (st.dropped || [])
    .filter((d) => d.turn && !FORBIDDEN.test(d.id) &&
      Math.abs(d.turn.yaw) <= ((st.targets || []).length ? TURN_YAW_MAX : 180) &&
      Math.abs(d.turn.pitch) <= TURN_PITCH_MAX &&
      (pressed.get(keyOf(sig, d)) || 0) < PRESS_CAP)
    .sort((a, b) =>
      (Math.abs(a.turn.yaw) + Math.abs(a.turn.pitch)) -
      (Math.abs(b.turn.yaw) + Math.abs(b.turn.pitch)))[0] || null;

  const facing = (st) => (st.pose ? st.pose.yaw + (st.pose.lookYaw || 0) : null);
  const elevation = (st) => (st.pose ? st.pose.pitch + (st.pose.lookPitch || 0) : null);
  const wrap = (d) => ((d + 540) % 360) - 180;

  /**
   * ⚑ UNDO BY MEASURING, NOT BY COUNTING BACK. The obvious undo — press the
   * opposite arrow the same number of times — is wrong, and one probe run
   * proved it: a press landing while a camera curve is in flight spends itself
   * cancelling the curve (`nudgeCamera`) instead of turning, so three lefts can
   * be two lefts, and three rights then leave the view 6° short of where it
   * started. The walk guards on `driven` so this should not arise, but a neck
   * that drifts a little on every glance is exactly the kind of slow lie this
   * file exists to refuse. Read the pose, work out the difference, close it.
   */
  const restoreLook = async (yawWas, pitchWas) => {
    for (let round = 0; round < 3; round++) {
      const st = await page.evaluate(() => window.__camPose ? window.__camPose() : null);
      if (!st) return;
      const dy = Math.round(wrap(yawWas - (st.yaw + (st.lookYaw || 0))) / YAW_STEP);
      const dp = Math.round((pitchWas - (st.pitch + (st.lookPitch || 0))) / PITCH_STEP);
      if (!dy && !dp) return;
      await turnBy(dy, dp);
    }
  };

  /**
   * ⚑ A TURN THAT FINDS NOTHING IS UNDONE. Otherwise the walk drifts: each
   * fruitless glance leaves the view a little further round, and forty steps
   * later the walker is reading a wall and the report blames the piece. Turn,
   * look, and if it was not there, turn back — which is also what a person does.
   */
  const turnHead = async (want, before) => {
    let yawSteps = Math.round(want.turn.yaw / YAW_STEP);
    let pitchSteps = Math.round(want.turn.pitch / PITCH_STEP);
    // already facing it — so the rejection was frame chrome sitting on top, and
    // the answer is to move the projection out from under it, not to stand still
    if (!yawSteps && !pitchSteps) yawSteps = want.turn.yaw >= 0 ? 1 : -1;

    const was = facing(before);
    const wasPitch = elevation(before);
    await turnBy(yawSteps, pitchSteps);
    let after = await probe();
    const now = facing(after);

    if (was !== null && now !== null &&
        Math.abs(wrap(now - was)) < 0.5) {
      /**
       * ⚑ THE KEYS DID NOT REACH THE PIECE, and that is a finding about this
       * tool, reported as one rather than quietly producing a walk that looks
       * like a walk. app.ts gates the arrow block on `options.reinterp`, on the
       * game menu being shut and on the OS not being paused; a curve in flight
       * also owns the pose. Say so once and stop trying.
       */
      headWorks = false;
      note('turn-refused', {
        target: want.id, surface: want.surface, era: after.era, phase: after.phase,
        what: 'pressed ' + Math.abs(yawSteps) + ' arrow key(s) and the view did not move — ' +
          'the look keys are not reaching the piece (paused? game menu open? a camera ' +
          'curve in flight?). No further turns will be attempted this run.'
      });
      return after;
    }

    const got = after.targets.some((t) => t.surface === want.surface && t.id === want.id);
    turns.push({
      id: want.id, surface: want.surface, era: before.era, phase: before.phase,
      yaw: want.turn.yaw, pitch: want.turn.pitch, dist: want.turn.dist,
      was: want.why, got
    });
    note(got ? 'turn' : 'turn-miss', {
      target: want.id, surface: want.surface, era: after.era, phase: after.phase,
      spine: after.spine,
      what: (got ? 'turned ' : 'turned ') + want.turn.yaw + '° yaw / ' + want.turn.pitch +
        '° pitch toward `' + want.id + '` (' + want.turn.dist + ' m, was "' + want.why + '")' +
        (got ? ' — it is in frame now' : ' — still not in frame; turning back')
    });
    if (!got) { await restoreLook(was, wasPitch); after = await probe(); }
    return after;
  };

  /**
   * ⚑ THE SWEEP — for the update ritual, which publishes no rects.
   * A coarse grid over the OS canvas, pressed until something moves. The point
   * that works is recorded, because that point IS the finding.
   */
  /** where a swept surface's button turned out to be, so it is found once */
  const known = new Map();
  const sweep = async (before, why) => {
    /**
     * ⚑ NEVER SWEEP DANIEL'S GLASS IN THE CLOSE (2026-09-13). The sweep is
     * blind — a grid of presses on the OS canvas's plane — and in the Close
     * that plane carries the Restart card, whose buttons are FORBIDDEN by id
     * for exactly the reason a blind grid cannot honour: `Start again`
     * reloads the page. One walk died that way at step 385, seconds from its
     * own green. The card publishes every control it has, so there is nothing
     * hidden there to find.
     */
    const closeOn = await page.evaluate(() => !!(window.__closeMonitor && window.__closeMonitor.on));
    if (closeOn) { note('sweep-skip', { what: 'the Close: the glass is the Restart card, every control published, nothing to sweep' }); return before; }
    const pts = await page.evaluate(({ VW, VH }) => {
      const root = window.__app.root;
      let cam = null; root.forEach((e) => { if (e.camera && e.enabled) cam = e; });
      const Vec3 = root.getPosition().constructor;
      const SCREEN = { w: 0.4, h: 0.3, x: 0, y: 1.08, z: 0 };
      const WS = { w: 676, h: 390 }, OS = { w: 512, h: 384 };
      const RITUAL = { x: Math.round((WS.w - OS.w) / 2), y: Math.round((WS.h - OS.h) / 2) };
      const toPage = (x, y, z) => {
        const p = cam.camera.worldToScreen(new Vec3(x, y, z));
        return p.z > 0 && p.x > 4 && p.y > 4 && p.x < VW - 4 && p.y < VH - 4 ? [p.x, p.y] : null;
      };
      const onPlane = (n, lx, ly, LW, LH) => {
        const e = root.findByName(n);
        if (!e || !e.enabled) return null;
        const m = e.getWorldTransform().data;
        const u = lx / LW - 0.5, v = ly / LH - 0.5;
        return toPage(m[12] + u * m[0] + v * m[8], m[13] + u * m[1] + v * m[9], m[14] + u * m[2] + v * m[10]);
      };
      const osPoint = (lx, ly) =>
        toPage(SCREEN.x + (lx / OS.w - 0.5) * SCREEN.w, SCREEN.y - (ly / OS.h - 0.5) * SCREEN.h, SCREEN.z) ||
        onPlane('era4-visor', lx, ly, OS.w, OS.h) ||
        onPlane('era3-device-workstation', lx + RITUAL.x, ly + RITUAL.y, WS.w, WS.h);
      // ⚑ AIM WHERE THIS PIECE PUTS ITS BUTTONS. Every dialog in the build is a
      // centred `windowFrame` with its controls on the last row of the content
      // rect, which for the two silent surfaces lands around y = 316 (the kit's
      // NEXT) and y = 300 (the update's). So sweep the whole canvas, but visit
      // it in order of distance from that band: the button is normally found in
      // the first dozen presses instead of the four hundredth.
      const out = [];
      for (let y = 24; y <= 372; y += 14)
        for (let x = 36; x <= 486; x += 22) {
          const p = osPoint(x, y);
          if (p) out.push({ l: [x, y], p, d: Math.abs(y - 312) });
        }
      out.sort((a, b) => a.d - b.d);
      return out;
    }, { VW: VIEW.width, VH: VIEW.height });

    for (const c of pts) {
      await doPress(c.p, 280);
      const after = await probe();
      if (moved(before, after)) {
        if (why) known.set(why, c.l);
        note('sweep-hit', {
          target: '(swept) ' + (why || 'ritual'), surface: 'os', logical: c.l,
          page: [Math.round(c.p[0]), Math.round(c.p[1])],
          era: after.era, phase: after.phase, spine: after.spine,
          ledgerDelta: after.ledCount - before.ledCount, changed: true,
          what: 'found by sweep — this surface publishes no hit rects'
        });
        return after;
      }
    }
    note('sweep-miss', { what: 'swept ' + pts.length + ' points on the OS canvas for ' +
      (why || 'the ritual') + ' and nothing moved' });
    return await probe();
  };

  /**
   * ⚑ THE WALKER REMEMBERS WHAT IT HAS PRESSED, PER SCREEN, FOR THE WHOLE RUN,
   * and each half of that sentence was bought with a failed run.
   *
   * PER SCREEN, because the profile screen's Continue only REGISTERS AS A HIT
   * once an icon, three chips and a goal are all chosen — so a walker that
   * re-presses its first choice can never arm the control that would let it
   * out. Run 2 pressed one profile icon seventy-four times.
   *
   * FOR THE WHOLE RUN, because the provotypes are BUILT to loop: a vignette's
   * choices include one that returns to an earlier state, and the app's own
   * note says the choice "only decides how much longer the same content
   * repeats". Memory that resets whenever the screen changes learns nothing
   * from a cycle — run 4 alternated between two screens seventy times, taking
   * the repeat branch every single time. Remembering per SIGNATURE instead
   * means the second visit to a screen tries the option the first visit did
   * not, which is what a person does and what eventually reaches the debrief.
   *
   * ⚑ Returns null when everything left is refused or already tried — and the
   * caller must then WAIT, because that is what a player does while a scripted,
   * unpressable beat runs.
   */
  const pick = (targets, sig, seen, dismissFirst) => {
    let live = targets.filter((t) =>
      t.surface !== 'prop' && !FORBIDDEN.test(t.id) && !capped(sig, t));
    /**
     * ⚑ THE TAB BUDGET (see MIN_TABS). Counted from the LEDGER, not from this
     * tool's own memory of what it pressed — `e4Space:tab:*` is filed once per
     * tab opened, which is the piece's own definition of "read". Once the budget
     * is met the browser's controls stop being candidates, the screen reads as
     * finished, and the ordinary machinery (nothing here → look round → the
     * headset) does the rest. A player who has read two tabs does not keep
     * pressing the browser; they put the device on.
     */
    // ⚑ 2026-09-12: the tabs are steps on rails now (ERA4_OVERHAUL §2); the
    //   budget only ever applied to the optional browser, so it stands down
    //   once the program has begun
    if (MIN_TABS !== null && lastState && lastState.era === 'e4' && !lastState.program) {
      const read = lastState.ledList.filter((e) => e.indexOf('e4Space:tab:') === 0).length;
      if (read >= MIN_TABS) live = live.filter((t) => t.surface !== 'e4.browser');
    }
    // a bare plane is a last-resort press: prefer any real control that exists
    if (!live.length) return null;
    /**
     * ⚑ IF SOMETHING IS IN THE WAY, CLOSE IT — the one move a person makes
     * without thinking and the walker had no way to reach. When a press lands
     * on a control that is registered but swallowed, the cause is a modal above
     * it, and the answer is not to try the other controls on that modal: it is
     * to shut the modal. Without this the walk sat in Era 1 opening provotypes
     * over a booklet it could see and could not touch, because `leave` is a
     * last resort everywhere else and never came up.
     */
    if (dismissFirst) {
      // ⚑ searched over ALL targets, ignoring the press cap. Getting out of the
      //   way is always legitimate and must never be rationed: once `leave` had
      //   been spent on its cap the walker could no longer dismiss anything, so
      //   a provotype opened mid-conversation swallowed the rest of IRC's
      //   escalation and the walk stranded there with every other control dead.
      const out = targets.find((t) =>
        t.surface !== 'prop' && !FORBIDDEN.test(t.id) &&
        /^leave$|^close$|^dismiss$|^okay?$/i.test(t.id));
      if (out) return out;
    }
    /**
     * ⚑ A CONTROL THAT NEVER LEADS SOMEWHERE NEW GOES TO THE BACK.
     * Era 2's desktop carries three icons that reopen apps you have already
     * read — send, Restorify, the era badge — while what actually moves the era
     * is Lamby's conduction, which ARRIVES ON ITS OWN. A walker ranking only by
     * novelty presses those three forever: run 16 spent 427 presses, forty-five
     * consecutively with nothing moving.
     *
     * ⚑ BUT "LEADS SOMEWHERE NEW" HAD TO BE MEASURED PROPERLY. Judging it by
     * the coarse state — era, phase, spine, queue mode, ledger — was run 17, and
     * it was worse: turning a page of Era 1's booklet moves none of those, so
     * the kit's NEXT was written off as dead after two presses and the era could
     * not be finished at all. The honest test is whether the press produced a
     * SCREEN THE WALK HAS NEVER SEEN. A booklet page is new every time; an icon
     * reopening a window you have already read is not.
     */
    /**
     * ⚑ FINISH WHAT IS IN FRONT OF YOU BEFORE OPENING ANYTHING ELSE.
     * Era 1's desktop keeps two OPTIONAL provotype icons registered underneath
     * whatever is running — the booklet, Rob's DM, the escalation — and opening
     * one puts a modal on top that swallows every click meant for the thing it
     * covers. The walker did that repeatedly, mid-conversation, and stranded
     * itself: the replies it still owed IRC became unreachable, and the icons
     * it had used to get there were spent. A person does not open a second
     * window in the middle of being talked to. So while any sub-app surface is
     * offering controls, the desktop's own icons are not candidates.
     */
    const withRects = live.filter((t) => t.surface !== 'plane');
    const pool = withRects.length ? withRects : live;
    const inApp = pool.some((t) => t.surface !== 'os');
    let scoped = inApp ? pool.filter((t) => t.surface !== 'os') : pool;
    /**
     * ⚑ S178 — A PHONE IN THE HAND IS USED. A press on the resting phone only lifts it
     * (the piece's design: lying on its stand it is not for reading), and any press past
     * it puts it down. So a walker that lifted the phone and then reached for the monitor
     * had lifted it for nothing — and did that for 800 steps once the phone sat lower on
     * the desk (S178), because a lift reads as "inert". A person holding their phone uses
     * it: while it is in the hand, only its own controls are candidates (its Back
     * included, which is otherwise a last resort).
     */
    //   …for a few presses, then it goes back on its stand: a person looks, and puts it
    //   down to get on with the work (which is also what brings the next news to it).
    if (lastState && lastState.phoneHeld && heldRun <= 4) {
      const onPhone = scoped.filter((t) => t.surface === 'phone');
      if (onPhone.length) scoped = onPhone;
    }
    const tier = (t) => {
      if (LAST_RESORT.test(t.id)) return 90;
      const i = PREFER.findIndex((rx) => rx.test(t.id));
      return i >= 0 ? i : 50;
    };
    // ⚑ least-pressed first WITHIN a tier, so a control already spent on this
    //   screen yields to one that has not been tried yet
    const here = (t) => pressed.get(keyOf(sig, t)) || 0;
    // ⚑ BREADTH FIRST, and it is what finally got the walk out of Era 1's
    // desktop. Two optional provotypes sit there beside the narrative's own
    // icons, and a walker choosing by preference alone re-entered the same two
    // apps a hundred times while the spine never moved once. Ranking by how
    // often a control has been pressed ACROSS THE WHOLE RUN means anything
    // untouched outranks anything already explored — so the walk spreads out
    // through the room's content instead of wearing a groove in one corner.
    return scoped.slice().sort((a, b) =>
      tier(a) - tier(b) ||
      here(a) - here(b) ||
      (seen.get(a.id) || 0) - (seen.get(b.id) || 0))[0] || null;
  };
  /** the screen's identity including what is DRAWN — used for loop detection and
   *  for deciding whether the piece is still moving while the walker waits */
  const screenOf = (st) =>
    st.era + '|' + st.phase + '|' + st.qMode + '|' + st.screenHash + '|' +
    st.targets.map((t) => t.surface + ':' + t.id).join();
  /**
   * ⚑ THE STABLE SIGNATURE — the same screen regardless of what is animating on
   * it. Everything the walker REMEMBERS is keyed on this rather than on the
   * pixels, and that distinction is the whole fix for Era 2.
   *
   * Keying memory on the pixel hash meant a blinking caret or a moving Lamby
   * counted as a new screen, so the walker's memory reset constantly, every
   * press looked like a discovery, and nothing could ever be judged useless. It
   * pressed the same three optional desktop icons 45 times in a row while the
   * era waited for a conduction beat that arrives on its own.
   */
  const stableOf = (st) =>
    st.era + '|' + st.phase + '|' + st.qMode + '|' +
    st.targets.map((t) => t.surface + ':' + t.id).sort().join();
  /** ⚑ real forward motion, as opposed to merely a different picture. The
   *  pixel hash makes signatures plentiful, so loop detection cannot rely on
   *  them alone — this is the coarse thing that must eventually move, and a
   *  long run of presses without it moving is the walk going nowhere. */
  const progressOf = (st) =>
    st.era + '|' + st.phase + '|' + st.spine + '|' + st.qMode + '|' + st.ledCount;
  /**
   * ⚑ ADVANCE, AS DISTINCT FROM ACTIVITY — and the difference is the ledger.
   * `progressOf` counts ledger entries, which is right for "is anything
   * happening at all". It is wrong for "did that press get me anywhere",
   * because the provotypes are BUILT to repeat and file a tag every time round:
   * run 21 pressed `primary` 72 times and `icon-irc` 69, and every one of them
   * looked like progress because the ledger kept growing. This is the one-way
   * measure — the era, the phase, the spine step, the queue mode. None of them
   * cycles, so nothing can farm it.
   */
  const advanceOf = (st) =>
    st.era + '|' + st.phase + '|' + st.spine + '|' + st.qMode;

  /** S221 — the text census: every distinct screen of words the walk saw, keyed by era, canvas and text */
  const census = new Map();
  const takeCensus = async (st, step) => {
    const now = await page.evaluate(() => (window.__textNow ? window.__textNow() : [])).catch(() => []);
    for (const c of now) {
      const words = c.text.split(/[\s|]+/).filter((w) => /[A-Za-z]/.test(w)).length;
      if (words < 1) continue;
      const key = st.era + '|' + c.size + '|' + c.text;
      const had = census.get(key);
      if (had) { had.seen++; continue; }
      census.set(key, { era: st.era, phase: st.phase, size: c.size, words, step, seen: 1, text: c.text });
    }
  };

  // ── the walk ──
  let s = await probe();
  /** the probe `pick` is being asked about — for the tab budget only */
  let lastState = s;
  let heldRun = 0;
  note('seated', { era: s.era, phase: s.phase, spine: s.spine, what: s.targets.length + ' live controls' });
  let stalls = 0;
  /** the last state in which the piece was seen to MOVE — see the loop detector */
  let lastMoving = '';
  const visits = new Map();
  let progress = progressOf(s);
  let sinceProgress = 0;
  /** how many times each control has been pressed in the whole run */
  const seen = new Map();
  /**
   * ⚑ ONE CONTROL, ONE SCREEN, AT MOST `PRESS_CAP` TIMES — and this replaces
   * three earlier attempts at the same problem, each of which broke something.
   *
   * A flat "press each control once per screen" cannot turn Era 1's booklet:
   * five pages share one stable signature and one control, so NEXT must be
   * pressable repeatedly. Judging a control by whether it moved the coarse
   * state wrote NEXT off as dead, because a page turn moves none of it.
   * Judging it by whether it reached a never-seen screen let Era 2's icons pass
   * forever, because animation made every screen look new.
   *
   * A cap needs none of that judgement — but a FLAT cap is still wrong, because
   * the piece legitimately asks for the same control many times over: IRC's
   * escalation answers turn after turn on the same two reply ids, and Era 3's
   * correction list takes thirteen APPLYs. Capping those at six stranded the
   * walk in Era 1.
   *
   * ⚑ So the cap counts INEFFECTIVE presses only, and any genuine advance —
   * the era, phase, spine step, queue mode or ledger moving — forgives every
   * counter at once. A control keeps working for as long as it keeps working.
   * What it cannot do is be pressed twelve times in a row while nothing happens,
   * which is precisely Era 2's three optional icons and nothing else in the
   * piece. Screens are finite and each allows only twelve fruitless presses, so
   * the walk still cannot loop forever by construction. Twelve clears the
   * longest real repetition in the piece by a wide margin: Era 1's booklet is
   * five pages and IRC's escalation is five turns.
   */
  const PRESS_CAP = 12;
  /** controls that were published as live but whose press did literally nothing */
  const inert = [];
  /** set when a press was swallowed: next choice should shut whatever is on top */
  let dismissWanted = false;
  /** consecutive holds spent watching the screen draw itself */
  const TALK_WAIT_MAX = 40;
  let talkWaits = 0;
  /**
   * ⚑ HOW LONG TO SIT STILL BEFORE CALLING IT STUCK — AND IT CANNOT BE ONE
   * NUMBER (A-5.3). Fourteen stalls at four seconds is fifty-six seconds, which
   * is a generous pause anywhere in Eras 1–3 and nowhere near enough for Era 4.
   * That era ends in a stretch that is SUPPOSED to be sat through: the offers'
   * own clock, then the ball — 46 lines over about three and a half minutes,
   * with nothing to press by design and long silences between them. Fifty-six
   * seconds into that, the old walker filed STUCK against a piece that was
   * midway through its one respite, and the report said Era 4 had no exit.
   *
   * ⚑ THIS IS PATIENCE, NOT BLINDNESS. The pulse still resets the counter the
   * instant anything moves on any channel, so a run that is genuinely frozen
   * still stops — it just takes eleven minutes to give up on Era 4 instead of
   * one. And a slow STUCK late in Era 4 is a real finding (A-8's dead hand-back
   * is exactly that); what was worthless was a fast one during the ball.
   */
  const stallCap = (st) => (st.era === 'e4' ? 160 : 14);
  const pressed = new Map();
  /**
   * ⚑ KEYED ON THE COARSE STATE, NOT ON THE FULL CONTROL SET, and run 22 is why.
   * A provotype sitting modally on top of the booklet changes its own chip ids
   * from state to state, so the SCREEN signature changed constantly — and with
   * the cap keyed on that, the booklet's NEXT got a fresh allowance every time
   * the thing covering it changed a caption. It was pressed forty-five times
   * into a modal that was swallowing every click. Keying on era/phase/queue-mode
   * plus the control's own id means a control accumulates its fruitless presses
   * no matter what else happens to be on screen beside it.
   */
  const keyOf = (sig, t) =>
    sig.split('|').slice(0, 3).join('|') + '\u0000' + t.surface + ':' + t.id;
  /**
   * ⚑ AN INERT MARK IS SCOPED TO THE SCREEN IT HAPPENED ON, and that scoping is
   * the whole point. The kit's NEXT is inert only WHILE a provotype covers it;
   * once that closes, the set of live controls changes, the stable signature
   * changes with it, and NEXT is pressable again. Marking it against the coarse
   * state instead made the booklet permanently unreachable for the rest of the
   * era — the walk got stuck one press into Era 1 having correctly diagnosed
   * the problem and then over-applied its own finding.
   */
  /**
   * ⚑ AND AN INERT JUDGEMENT MUST NOT OUTLIVE THE PICTURE IT WAS MADE ABOUT
   * (S103c). `inertKey` is built from the STABLE signature, which is constant
   * for a whole era — so one fruitless press early in Era 4 blacklisted a
   * surface for the rest of it. Measured: the laptop was pressed at step 325
   * while L had finished with it, judged inert, and was therefore still
   * blacklisted ninety steps later when the SAME lid became the Close's card
   * with the last press in the work on it.
   *
   * A surface that starts drawing something new is not the surface that was
   * inert. When the drawn screen changes, the marks go. `PRESS_CAP` still
   * bounds anything genuinely dead, so this cannot become a loop.
   */
  const inertMarks = new Set();
  let inertHash = '';
  /**
   * ⚑ WHAT IT COULD NOT AIM AT, AND WHY (S103c). `probe()` has always computed a
   * reason for every target it drops — "off-screen at 527,880", "behind the
   * camera", "…is disabled" — and thrown it away at the end of the step. So a
   * control that exists, is published, and simply cannot be reached from the
   * seat looked identical, in every report, to a control that does not exist.
   * That is the project's oldest defect class showing up in the instrument built
   * to find it. Now it is aggregated and printed.
   */
  const unaimed = new Map();
  const inertKey = (sig, t) => sig + '\u0000' + t.surface + ':' + t.id;
  /**
   * ⚑ AN EXIT IS NEVER CAPPED (S142). `leave` closes a provotype; it is the way
   * OUT of a window, not a way forward, and capping it trapped the walk inside
   * the pillow while Rob typed his third line under it — the channel had just
   * grown nine lines (the room talks to Daniel now) and the walker spent that
   * minute opening and leaving the two provotypes until `leave` hit PRESS_CAP,
   * then opened one more and could not close it. Stuck, with the escalation's
   * reply tray live under the window.
   */
  const EXIT = /^leave$|^back$|^close$/i;
  const capped = (sig, t) =>
    !EXIT.test(t.id) && ((pressed.get(keyOf(sig, t)) || 0) >= PRESS_CAP || inertMarks.has(inertKey(sig, t)));
  /** every live control here has been pressed to its cap: the screen is spent */
  const spent = (st, sig) => {
    const live = st.targets.filter((t) => t.surface !== 'prop' && !FORBIDDEN.test(t.id));
    return live.length > 0 && live.every((t) => capped(sig, t));
  };

  /**
   * ⚑ consecutive probes in which the room has not followed the desktop. A
   * transition is allowed to be mid-flight — the morph and the seat cut do not
   * land on the same frame — so this must persist before it means anything.
   */
  let desyncRuns = 0;

  for (let i = 0; i < MAX_STEPS; i++) {
    if (s.driven) { await wait(1600); s = await probe(); continue; }   // a travelling is playing
    await takeCensus(s, i);

    /**
     * ⚑ ONLY A JUMPED RUN CAN GET HERE, and the walk stops rather than
     * describing the room it was dropped into. See BROKEN_JUMPS: everything
     * after this point would be a report about the flag, not the piece.
     */
    if (JUMP && s.roomDesync) {
      desyncRuns += 1;
      // ⚑ ~40 s. A real arrival is dark for a few seconds while the machine
      //   comes up, so this must outlast that and still fire long before the
      //   stall counter turns the same situation into a misleading STUCK.
      if (desyncRuns >= 25) {
        note('stop', {
          what: 'THE ROOM DID NOT FOLLOW: ' + s.roomDesync + '. `debugJump` moves the desktop ' +
            'and never the space, so this run is sitting in one room reading an era that is ' +
            'staged in another. Nothing measured past here would be about the piece. Walk to ' +
            'this era instead of jumping to it.',
          era: s.era, phase: s.phase, spine: s.spine
        });
        await page.screenshot({ path: join(SHOT_DIR, 'walk_room_desync.png') });
        break;
      }
      await wait(1500);
      s = await probe();
      continue;
    }
    desyncRuns = 0;

    const sig = stableOf(s);
    lastState = s;
    heldRun = s.phoneHeld ? heldRun + 1 : 0;   // S178: how many steps the phone has been in hand
    /**
     * ⚑ A BEAT THAT IS DELIBERATELY DOING NOTHING IS NOT A DEAD END (S103b).
     *
     * `stableOf` is the same screen regardless of what animates on it — exactly
     * right for remembering presses, and exactly wrong as the sole input to a
     * loop detector, because this piece HAS a beat with no controls that lasts
     * three and a half minutes. The ball is the one place the work asks nothing
     * of you: no rects, no canvas change the hash can see, and its captions on
     * the DOM. To this counter that was indistinguishable from a wall, and it
     * called the walk looping at 80 visits — about a minute short of the press
     * that ends the piece.
     *
     * So the count resets whenever the piece VISIBLY MOVES: the drawn screen or
     * the DOM caption strip differs from the step before. Audio is deliberately
     * NOT counted here — a looping bed plays forever and would disable the
     * backstop entirely. The stall cap still bounds the waiting either way; this
     * only stops the walker concluding "no way onward" about a beat that is
     * mid-sentence.
     */
    for (const d of (s.dropped || [])) {
      const k = d.surface + ':' + d.id + ' \u2014 ' + d.why;
      unaimed.set(k, (unaimed.get(k) || 0) + 1);
    }
    if (s.screenHash !== inertHash) { inertHash = s.screenHash; inertMarks.clear(); }
    const moving = screenOf(s) + '\u241F' + (s.domText || '');
    if (moving !== lastMoving) { lastMoving = moving; visits.set(sig, 0); }
    visits.set(sig, (visits.get(sig) || 0) + 1);
    // a pure backstop: the press cap already bounds this, so reaching it means
    // something is returning here without any press of ours being responsible
    if (visits.get(sig) > 80) {
      note('stop', {
        what: 'THE WALK IS LOOPING: this same screen has come round 80 times with every ' +
          'control on it pressed to its cap — there is no way onward from here',
        era: s.era, phase: s.phase, spine: s.spine
      });
      await page.screenshot({ path: join(SHOT_DIR, 'walk_looping.png') });
      break;
    }
    /**
     * ⚑ A SILENT SURFACE IS ANSWERED FIRST, and it has to be. The kit — Era 1's
     * booklet, and the whole spine of the era — is modal, fills the screen and
     * publishes nothing, while two OPTIONAL provotype icons stay drawn and
     * registered underneath it. A walker that simply takes the aimable control
     * reads the room as "two provotypes", presses them for a hundred steps and
     * never turns a page of the thing actually in front of it. Which is what
     * runs 4 through 8 did, and it is a fair description of how a person would
     * misread that screen too.
     */
    for (const name of s.silent) {
      const at = known.get(name);
      if (at) {
        const pt = await page.evaluate(({ lx, ly, VW, VH }) => {
          const root = window.__app.root;
          let cam = null; root.forEach((e) => { if (e.camera && e.enabled) cam = e; });
          const V = root.getPosition().constructor;
          const S = { w: 0.4, h: 0.3, x: 0, y: 1.08, z: 0 };
          const p = cam.camera.worldToScreen(
            new V(S.x + (lx / 512 - 0.5) * S.w, S.y - (ly / 384 - 0.5) * S.h, S.z));
          return p.z > 0 && p.x > 4 && p.y > 4 && p.x < VW - 4 && p.y < VH - 4 ? [p.x, p.y] : null;
        }, { lx: at[0], ly: at[1], VW: VIEW.width, VH: VIEW.height });
        if (pt) {
          const before = s;
          await doPress(pt);
          s = await probe();
          note('press', {
            target: name + ' (known control)', surface: name, logical: at,
            page: [Math.round(pt[0]), Math.round(pt[1])],
            era: s.era, phase: s.phase, spine: s.spine,
            ledgerDelta: s.ledCount - before.ledCount, changed: moved(before, s)
          });
          if (moved(before, s)) break;
          known.delete(name);   // it moved before and does not now: find it again
        }
      }
      note('silent-surface', {
        what: name + ' is live and owns no rect field at all — its button geometry lives ' +
          'inline in handleClick, so it must be found by sweeping',
        era: s.era, phase: s.phase, spine: s.spine
      });
      s = await sweep(s, name);
      break;
    }
    if (s.silent.length) continue;

    /**
     * ⚑ BEFORE CONCLUDING THERE IS NOTHING HERE, LOOK ROUND. This sits ahead of
     * the waiting-out branch on purpose: a screen whose every control has been
     * pressed to its cap is exactly the moment a person lifts their eyes off it,
     * and the old walker instead sat through its whole stall budget staring at a
     * spent screen — 160 of them in Era 4 — and then filed STUCK with the thing
     * it needed listed under "published but unreachable". The turn is tried
     * ONCE per control per coarse state, so a room with nothing in it cannot
     * become a merry-go-round; any real advance forgives that, like the press
     * caps, because the situation has genuinely changed.
     */
    if (!justTurned && headWorks && !s.driven) {
      /**
       * ⚑ "NOTHING HERE" INCLUDES "NOTHING NEW HERE", and Era 4 is why (the same
       * afternoon the monitor became pressable). A spent screen is the obvious
       * case; the one that actually stranded the walk is a screen that stays
       * pressable for ever. The browser has six tabs and an endless supply of
       * presses, so `pick` always returned something, the turn was never
       * considered, and the walker read the same five tabs round and round until
       * `GOING NOWHERE` fired at 45 presses — with the headset, and the whole
       * rest of the era, 37° to its left the entire time.
       *
       * A person who has read what is in front of them looks up. `sinceProgress`
       * is exactly that reading: presses that moved neither the era, the phase,
       * the spine, the queue nor the ledger. Twelve of them is well inside the
       * 45-press backstop, so the glance happens while there is still a walk left
       * to save — and `turnedFor` still allows only one turn per control per
       * coarse state, so this cannot become a swivel.
       */
      const nothingHere = spent(s, sig) || sinceProgress >= 12 ||
        !pick(s.targets, sig, seen, false);
      const want = nothingHere ? turnable(s, sig) : null;
      if (want && !turnedFor.has(keyOf(sig, want))) {
        turnedFor.add(keyOf(sig, want));
        s = await turnHead(want, s);
        // only a turn that FOUND something earns the grace step; a miss has
        // already been undone, so the walk should carry straight on
        justTurned = s.targets.some((t) => t.surface === want.surface && t.id === want.id);
        continue;
      }
    }

    /**
     * ⚑ WHEN THE SCREEN IS SPENT, WAIT — DO NOT KEEP PRESSING.
     * Era 2's desktop offers three optional icons and nothing else, while what
     * actually moves the era is Lamby's conduction, WHICH ARRIVES ON ITS OWN.
     * Once every control here has had its six presses there is nothing useful
     * left to do but let the machine finish talking, which is also exactly what
     * a person does. The wait ends the moment anything on screen changes.
     */
    if (spent(s, sig) && stalls < stallCap(s)) {
      stalls += 1;
      note('waiting-out', {
        what: 'every control on this screen has been pressed to its cap — waiting for the ' +
          'piece to speak rather than pressing spent controls',
        era: s.era, phase: s.phase, spine: s.spine
      });
      const was = pulseOf(s);
      await wait(5000);
      s = await probe();
      if (pulseOf(s) !== was) stalls = 0;
      continue;
    }
    /**
     * ⚑ DO NOT INTERRUPT THE MACHINE MID-SENTENCE. IRC's escalation is TIMED —
     * Rob types at thirteen characters a second with a three-and-a-half second
     * hold after each line — so it can be a full minute before the reply tray
     * appears. The walker had optional provotypes available the whole time and
     * so never once sat still to watch: it opened and closed them for seventy
     * presses while the conversation it was supposed to be having played out
     * unattended. Two probes a second apart tell a screen that is drawing
     * itself from a screen that is merely waiting, and a person watching text
     * type does not go and click something else.
     *
     * Bounded, because some screens animate forever (a caret, Lamby idling):
     * after `TALK_WAIT_MAX` consecutive holds the walker presses anyway.
     */
    if (talkWaits < TALK_WAIT_MAX) {
      const before = pulseOf(s);
      await wait(900);
      const now = await probe();
      if (pulseOf(now) !== before) {
        s = now;
        talkWaits += 1;
        if (talkWaits === 1 || talkWaits % 6 === 0) {
          note('listening', {
            what: 'the screen is still drawing itself — holding rather than clicking over it',
            era: s.era, phase: s.phase, spine: s.spine
          });
        }
        continue;
      }
      s = now;
    }
    talkWaits = 0;

    let t = pick(s.targets, sig, seen, dismissWanted);
    /**
     * ⚑ THE GRACE LASTS UNTIL A CHOICE IS MADE, NOT UNTIL THE NEXT ITERATION —
     * and the difference is a whole failed run. Cleared at the top of the loop,
     * it was spent by the `listening` hold that fires whenever the screen is
     * still drawing itself, which in this era is every time the address bar's
     * cursor blinks. So the walker turned to the headset, held for 900 ms to
     * watch a caret, and turned away again without ever touching it. The grace
     * ends here, where the walker actually gets to choose something.
     */
    justTurned = false;
    dismissWanted = false;
    if (t) {
      stalls = 0;
      const wasAdvance = advanceOf(s);
      pressed.set(keyOf(sig, t), (pressed.get(keyOf(sig, t)) || 0) + 1);
      seen.set(t.id, (seen.get(t.id) || 0) + 1);
      const after = await press(t, s);
      /**
       * ⚑ A PRESS THAT CHANGES NOTHING AT ALL — not one pixel, not one field —
       * did not reach anything, and the control is spent here immediately
       * rather than after twelve tries.
       *
       * This is not a nicety; it is the walker's only defence against a control
       * that the piece ADVERTISES AS LIVE BUT SWALLOWS. While a provotype is
       * modally open, `os.handleClick` delegates every click to it and returns —
       * yet the kit underneath goes on registering its NEXT rect, and IRC its
       * replies. Run 22 pressed that unreachable NEXT forty-five times. Note
       * the distinction from a quiet-looking but real press: selecting a chip
       * or turning a page moves the drawn pixels, so only a press that moves
       * literally nothing is judged inert.
       *
       * ⚑ AND "NOTHING AT ALL" MEANS ON EVERY CHANNEL — the pulse, not the OS
       * canvas alone (A-5.1). Era 4's opening is three presses on Maya's
       * laptop, whose entire visible effect is one line arriving on a screen
       * this hash did not cover; the first press was therefore judged inert on
       * the spot, marked never-again, and the era's own door went unopened for
       * two whole review rounds. The failure direction here is asymmetric and
       * worth naming: judging a live control inert STOPS the walk dead, while
       * judging an inert one live costs at most `PRESS_CAP` wasted presses on
       * one screen. Be generous, and let the cap do the bounding.
       */
      if (pulseOf(after) === pulseOf(s) && advanceOf(after) === advanceOf(s)) {
        inertMarks.add(inertKey(sig, t));
        dismissWanted = true;
        inert.push({ id: t.id, surface: t.surface, era: s.era, phase: s.phase });
        note('inert', {
          target: t.id, surface: t.surface, era: s.era, phase: s.phase, spine: s.spine,
          what: 'registered as live but the press changed nothing at all — most likely ' +
            'swallowed by a modal above it; not pressed again here'
        });
      }
      // a press that moved nothing is a finding, not a retry cue — but it may
      // still have moved something this probe cannot see (a chip selected, an
      // icon chosen), so the memory above is what keeps the walk moving on.
      s = (!moved(s, after) && s.ritualOpen) ? await sweep(after, null) : after;
      // ⚑ a real advance forgives every fruitless-press counter: the situation
      //   has genuinely changed, so nothing learned before it still applies.
      //   Deliberately NOT the ledger — see advanceOf.
      if (advanceOf(s) !== wasAdvance) { pressed.clear(); turnedFor.clear(); }
      const p = progressOf(s);
      /**
       * ⚑ A TURN IS FORGIVEN BY THE LEDGER, WHERE A PRESS IS NOT, and the
       * asymmetry is deliberate. `advanceOf` deliberately excludes the ledger
       * because the provotypes file a tag every time round and a press-cap that
       * trusted it could be farmed forever. Nothing can farm a TURN — it presses
       * nothing and files nothing — so the de-duplicator may safely use the
       * coarser "has anything at all happened" test.
       *
       * It has to. Era 4 sits at `e4|desktop|e4|board` from the update to the
       * Close, so under `advanceOf` alone the walker got ONE turn toward the
       * headset for the whole era — and the ball's hand-back is a second press
       * on that same headset, 41.6° away, with nothing else on screen. Measured:
       * `(press) era4-visor` published and off-screen for 155 consecutive steps
       * while the walk waited out a spent screen and then declared itself
       * looping, one turn short of the ending.
       */
      if (p !== progress) { progress = p; sinceProgress = 0; turnedFor.clear(); }
      else sinceProgress += 1;
      if (sinceProgress >= 45) {
        note('stop', {
          what: 'GOING NOWHERE: 45 presses without the era, phase, spine, queue mode or ' +
            'ledger changing once — the piece is responding, but nothing here leads onward',
          era: s.era, phase: s.phase, spine: s.spine
        });
        await page.screenshot({ path: join(SHOT_DIR, 'walk_nowhere.png') });
        break;
      }
    } else if (s.ritualOpen || s.silent.length) {
      // something owns the screen and registered nothing to press: find it
      note('silent-surface', {
        what: 'live and publishing no hit rects: ' +
          (s.silent.join(', ') || 'the update ritual') + ' — sweeping for its controls',
        era: s.era, phase: s.phase, spine: s.spine
      });
      s = await sweep(s, null);
    } else if (s.moves.length) {
      const m = s.moves[0];
      const before = s;
      await doPress(m.pt);
      s = await probe();
      note('move', {
        target: m.id, surface: 'marker', page: [Math.round(m.pt[0]), Math.round(m.pt[1])],
        era: s.era, phase: s.phase, spine: s.spine, changed: moved(before, s)
      });
    } else if (stalls === 2) {
      /**
       * ⚑ SOMETIMES THE WHOLE SCREEN IS THE BUTTON, and no rect will ever say
       * so. Era 2 opens in a stage the code calls `silence` — "nothing speaks,
       * not even the era-status toast; the monitor holds only the waiting line
       * until pressed" — and ANY press on the dark glass advances it, so it
       * deliberately registers nothing. Run 9 sat in front of it for fifty-six
       * seconds reporting "nothing to press" at a screen that was pressable
       * everywhere. A sweep is the only honest way to tell that apart from a
       * genuine dead end, so after a couple of patient waits, sweep.
       */
      note('silent-screen', {
        what: 'nothing registered anywhere and nothing has moved — sweeping the canvas ' +
          'in case the screen itself is the control',
        era: s.era, phase: s.phase, spine: s.spine
      });
      stalls += 1;
      s = await sweep(s, null);
    } else {
      stalls += 1;
      note('idle', {
        what: 'waiting — ' + s.rawOsHits + ' hit rect' + (s.rawOsHits === 1 ? '' : 's') +
          ' registered, ' + s.targets.length + ' aimable, ' + s.dropped.length + ' unaimable, ' +
          s.moves.length + ' markers',
        era: s.era, phase: s.phase, spine: s.spine, qMode: s.qMode,
        dropped: s.dropped,
        offered: s.targets.map((t) => t.surface + ':' + t.id),
        surfaces: s.surfaces,
        waited: stalls + '/' + stallCap(s),
        audio: s.audio.playing ? s.audio.now : ''
      });
      if (stalls >= stallCap(s)) {
        note('stop', {
          what: s.dropped.length
            ? 'STUCK. ' + s.dropped.length + ' hit rect' + (s.dropped.length === 1 ? ' is' : 's are') +
              ' registered and none can be aimed at' +
              (s.dropped.every((d) => d.why === 'behind the camera')
                ? ' — but every one of them is BEHIND THE CAMERA, i.e. on a surface in a room ' +
                  'the player has already left, which is expected rather than wrong. The real ' +
                  'finding is that this era offers nothing in front of you: '
                : ' — ') +
              s.dropped.map((d) => d.id + ' (' + d.surface + ', ' + d.why + ')').join('; ')
            : 'STUCK, AND THERE IS NOTHING TO PRESS: ' + s.rawOsHits +
              ' hit rects registered, ' + s.moves.length + ' markers, nothing else offered',
          era: s.era, phase: s.phase, spine: s.spine, dropped: s.dropped
        });
        await page.screenshot({ path: join(SHOT_DIR, 'walk_stuck.png') });
        break;
      }
      await wait(4000);
      const before = pulseOf(s);
      s = await probe();
      /**
       * ⚑ A SCREEN THAT IS STILL CHANGING IS NOT A STALL, and Era 4 is why.
       * L speaks, and her chips exist ONLY while the voice is `waiting` — so the
       * era legitimately offers nothing to press for ten or fifteen seconds at a
       * time, several times over. Run 11 called that a dead end and reported an
       * era with no way onward, when what it had actually found was somebody
       * talking. Comparing the drawn pixels rather than the whole signature
       * means any movement at all — a caption arriving, a picture easing —
       * resets the patience, and only a genuinely FROZEN screen runs it out.
       *
       * ⚑ AND "MOVEMENT" NOW INCLUDES THE TWO CHANNELS THIS TEST COULD NOT SEE
       * (A-5.3): the ball's DOM captions and any clip in the air. The pixels
       * alone were not enough — the ball's three and a half minutes move no
       * canvas at all, so the old test read the piece's one respite as a frozen
       * screen and abandoned the run in the middle of it.
       */
      if (pulseOf(s) !== before) stalls = 0;
    }
  }

  const final = await probe();
  note('end', { what: 'walk finished', era: final.era, phase: final.phase, spine: final.spine });
  await page.screenshot({ path: join(SHOT_DIR, 'walk_end.png') });

  // ── the deliverable ──
  /**
   * ⚑ LOCAL DATE, NOT UTC (2026-09-05). `toISOString()` is UTC, and for the two
   * hours a day when the author's clock is a day ahead of it, this stamped
   * YESTERDAY — which meant a run made on the 5th wrote itself over the report
   * from the 4th instead of beside it. That has now happened to the same file
   * twice: once to a `--max 12` gate test, and once to a full traversal. Both
   * times the file that was overwritten was the ONLY evidence that this piece
   * can be played to its end.
   *
   * A report is named for the day the person ran it, because that is the day
   * they will look for it under.
   */
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    + (JUMP ? '_JUMPED_' + JUMP : '') + (MIN_TABS !== null ? '_MIN' + MIN_TABS : '');
  const presses = log.filter((l) => l.kind === 'press' || l.kind === 'sweep-hit' || l.kind === 'move');
  const dead = presses.filter((p) => p.changed === false);
  const silentFound = [...new Set(log.filter((l) => l.kind === 'silent-surface')
    .map((l) => String(l.what).split(' is live')[0]))];
  const sweptAt = {};
  for (const l of log)
    if (l.kind === 'sweep-hit' && l.target) {
      const n = String(l.target).replace('(swept) ', '');
      if (!sweptAt[n]) sweptAt[n] = l.logical;
    }

  {
    // ⚑ S221 — the text census report (docs/reinterp/TEXT_CENSUS_<stamp>.md)
    const rows = [...census.values()];
    // a screen that grows (a chat filling, a page typing out) is many entries; keep the largest of each prefix family
    //   … and a screen that changes in place (a record filling, a choice lit) is one screen: grouped by era, canvas and its
    //   opening words (its title, in practice), the fullest version kept, with how many variants it had
    const fam = new Map();
    for (const r of rows) {
      const k = r.era + '|' + r.size + '|' + r.text.slice(0, 48);
      const f = fam.get(k);
      if (!f) fam.set(k, { ...r, variants: 1 });
      else { f.variants++; if (r.words > f.words) Object.assign(f, { ...r, variants: f.variants }); }
    }
    const keep = [...fam.values()];
    const byEra = {};
    for (const r of keep) { const e = (byEra[r.era] ??= { screens: 0, words: 0, max: 0 }); e.screens++; e.words += r.words; e.max = Math.max(e.max, r.words); }
    const top = [...keep].sort((a, b) => b.words - a.words).slice(0, 40);
    let cm = 'STATUS: live\n\n# Text census — ' + stamp + '\n\n';
    cm += '*Made by tools/walk.mjs (S221, W1-B1/B2). Every distinct screen of canvas text the walk saw, counted in words. ';
    cm += 'Canvas text only (the pixel games and the DOM chrome are not counted). A screen that fills up over time is counted at its fullest.*\n\n';
    cm += '## Per era\n\n| era | distinct screens | words in all | heaviest screen |\n|---|---|---|---|\n';
    for (const [e, v] of Object.entries(byEra)) cm += `| ${e} | ${v.screens} | ${v.words} | ${v.max} |\n`;
    cm += '\n## The 40 heaviest screens\n\n';
    for (const r of top) { const [cw, ch] = r.size.split('x').map(Number); cm += `### ${r.words} words · ${r.era} · ${r.phase} · canvas ${r.size} · step ${r.step}${r.variants > 1 ? ' · ' + r.variants + ' variants' : ''}${ch >= 2 * cw ? ' · ⚑ ATLAS: several panels on one canvas, one shown at a time' : ''}\n\n> ${r.text.slice(0, 900).replace(/\n/g, ' ')}${r.text.length > 900 ? ' …' : ''}\n\n`; }
    writeFileSync(join(OUT_DIR, 'TEXT_CENSUS_' + stamp + '.md'), cm);
    writeFileSync(join(OUT_DIR, 'TEXT_CENSUS_' + stamp + '.json'), JSON.stringify(keep, null, 1));
  }

  writeFileSync(join(OUT_DIR, 'WALK_' + stamp + '.json'), JSON.stringify({
    when: new Date().toISOString(), port: PORT, viewport: VIEW,
    jumpedTo: JUMP || null,
    isReachabilityProof: !JUMP,
    steps: log.length, presses: presses.length, turns,
    reachedEra: final.era, spine: final.spine,
    ledger: final.ledger, console: noise, log
  }, null, 1));

  /**
   * ⚑ MINUTES PER ERA, because that is the complaint. "Era 4 takes too long" is
   * about TIME, and until now this report led with presses — a count of
   * interaction, which the ball (three and a half minutes, no presses) does not
   * even appear in. Wall-clock is read off the log's own timestamps, per era.
   *
   * ⚑ AND THE TOOL'S OWN TIME IS SHOWN, NOT HIDDEN. Every press settles for
   * 1.2 s, every listening hold is 0.9 s, a turn ~0.5 s per arrow — none of
   * which a player pays. The overhead column is that sum; the piece column is
   * wall minus overhead. It is an estimate: the settle also covers time the
   * piece genuinely spends animating, so the piece column errs LOW. The ranking
   * between eras is robust to that; the absolute minutes are not, and nobody
   * should quote them to a second.
   *
   * ⚑ WAITING IS NOT OVERHEAD. The first version of this counted `waiting-out`
   * and `idle` as tool time and subtracted them — which subtracted THE BALL,
   * because the walker waits precisely when the piece is running a clock of
   * its own. Era 4 came out at 2.9 minutes, shorter than Era 2. It is 5.3. The
   * walker waits because a player would be waiting; that time is the piece's.
   *
   * ⚑ AND AN ERA'S CLOCK STOPS AT `spine: done`. After the Close the walker
   * sits through eighty rounds of a spent screen before it declares itself
   * looping — nearly seven minutes that belong to the tool's stopping rule,
   * not to the work. Nothing after the last spine step is counted.
   */
  const OVERHEAD = { press: 1.2, 'sweep-hit': 0.28, move: 1.2, listening: 0.9,
    turn: 0.5, 'turn-miss': 1.0 };
  const eras = [];
  let ended = false;
  for (const l of log) {
    if (!l.era || ended) continue;
    if (l.spine === 'done') ended = true;   // this line counts; nothing after it
    let e = eras[eras.length - 1];
    if (!e || e.era !== l.era) { e = { era: l.era, from: l.t, to: l.t, presses: 0, steps: 0, overhead: 0 }; eras.push(e); }
    e.to = l.t; e.steps += 1;
    if (l.kind === 'press' || l.kind === 'sweep-hit' || l.kind === 'move') e.presses += 1;
    e.overhead += OVERHEAD[l.kind] || 0;
  }
  const mm = (sec) => (sec / 60).toFixed(1);
  const eraTable = eras.length ? [
    '| era | wall | tool overhead | ≈ piece | presses | steps |',
    '|---|---|---|---|---|---|',
    ...eras.map((e) => {
      const wall = (e.to - e.from) / 1000;
      return '| `' + e.era + '` | ' + mm(wall) + ' min | ' + mm(e.overhead) + ' min | **' +
        mm(Math.max(0, wall - e.overhead)) + ' min** | ' + e.presses + ' | ' + e.steps + ' |';
    })
  ] : ['- no era boundaries recorded'];

  const md = [
    'STATUS: live', '',
    '# THE WALK — ' + stamp, '',
    ...(MIN_TABS !== null ? [
      '> ⚑ **MINIMUM-PATH RUN (`--min-tabs ' + MIN_TABS + '`).** In Era 4\'s browser stage the walker opened',
      '> the first ' + MIN_TABS + ' tab' + (MIN_TABS === 1 ? '' : 's') + ' the row offered and then left for the headset — Sérgio\'s definition of the',
      '> minimum player, 2026-09-11: *"opens two, then wears."* Every other era is walked exhaustively,',
      '> as always, so the eras stay comparable. Read beside the same day\'s exhaustive walk.', ''
    ] : []),
    '## MINUTES PER ERA', '',
    '*Wall-clock from the log\'s own timestamps, each era counted to its last step and the piece',
    'counted to `spine: done`. The tool\'s press settles and holds are summed and shown; the piece',
    'column is wall minus that, and it errs low. Time the walker spent WAITING is the piece\'s — it',
    'waits when a player would. Trust the ranking, not the seconds.*', '',
    ...eraTable, '',
    JUMP
      ? '> ⚑ **DIAGNOSTIC RUN, NOT A REACHABILITY PROOF.** This walk began with\n' +
        '> `debugJump("' + JUMP + '")` and therefore says NOTHING about whether a player can\n' +
        '> reach that beat by playing. Everything after the jump is ordinary clicking, but\n' +
        '> the way in was the very crutch this tool exists to do without. Only an unjumped\n' +
        '> run is evidence.\n'
      : '*Generated by `tools/walk.mjs`: click-only from the entrance. No `?era=`, no debug jump,\n' +
        'no `debugBeat`, no `__requestMove`. `&debug=1` is used to READ probes and never to press.*',
    '',
    '**Reached** `' + (final.era || '—') + '` · spine `' + (final.spine || '—') + '` · ' +
    '**' + presses.length + ' presses** over ' + log.length + ' steps · ' +
    dead.length + ' press' + (dead.length === 1 ? '' : 'es') + ' changed nothing', '',
    '## THE PATH', '',
    // ⚑ the ledger column names what was FILED, not just how many. A count can
    //   say a press mattered; only the name can say WHICH beat completed, and
    //   `laptop:read` is how Era 4's opening proves itself.
    '| # | control | surface | on surface | on screen | era | phase | filed |',
    '|---|---|---|---|---|---|---|---|',
    ...presses.map((p) => '| ' + p.step + ' | `' + p.target + '` | ' + (p.surface || '') + ' | ' +
      (p.logical ? p.logical.join(', ') : '—') + ' | ' + (p.page ? p.page.join(', ') : '—') + ' | ' +
      (p.era || '') + ' | ' + (p.phase || '') + ' | ' +
      ((p.ledgerNew && p.ledgerNew.length)
        ? '`' + p.ledgerNew.join('` `') + '`'
        : (p.ledgerDelta > 0 ? '+' + p.ledgerDelta : '')) + ' |'),
    '',
    '## WHAT THE LEDGER HOLDS AT THE END', '',
    '*Every entry filed over the run, in the order the ledger keeps them. This is the record the',
    'piece itself would show, and it is the honest answer to "did that beat actually happen".*', '',
    final.ledList.length
      ? final.ledList.map((e) => '- `' + e + '`').join('\n')
      : '- empty',
    '',
    '## WHAT WAS HEARD, IN ORDER', '',
    '⚑ S141 — every clip `play()`ed during the walk, in order (repeats collapsed). A cue that is on',
    'disk and registered but absent here is not wired; a beat with no cue near it is silent.', '',
    (final.audio && final.audio.names && final.audio.names.length
      ? final.audio.names.map((n, i) => `${i + 1}. \`${n}\``).join('\n')
      : '_nothing was played_'), '',
    '## THE HEAD TURNS', '',
    '*This walker turns, with the arrow keys — the same 6°-of-yaw look-in-place a player has, never',
    '`__camFree`. So a control off the seat bearing is no longer reported as unreachable without',
    'the walker first doing the one thing this piece asks of a body. A turn that found nothing is',
    'undone, so the view never drifts.*', '',
    turns.length
      ? ['| toward | surface | turn | distance | was rejected as | found it |',
         '|---|---|---|---|---|---|',
         ...turns.map((t) => '| `' + t.id + '` | ' + t.surface + ' | ' +
           t.yaw + '° yaw, ' + t.pitch + '° pitch | ' + t.dist + ' m | ' + t.was + ' | ' +
           (t.got ? '**yes**' : 'no') + ' |')].join('\n')
      : '- none were needed: nothing was ever rejected for being off-axis',
    '',
    '## ⚑ PUBLISHED BUT UNREACHABLE — what could not be aimed at, and why', '',
    '*A control the piece registers and the walker cannot reach from the seat. This is not the',
    'tool failing to find it: the rect was found, projected, and landed outside the frame or',
    'behind the camera. ⚑ Since 2026-09-11 it is also not the tool failing to LOOK at it: anything',
    'within ' + TURN_YAW_MAX + '° of the facing is turned toward before it is written off, so a line here means a',
    'player could not press it either by staring OR by turning. A control beyond that cap is in',
    'another room, and appearing here is expected rather than wrong.*', '',
    ...(unaimed.size === 0 ? ['- none.'] :
      [...unaimed.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)
        .map(([k, n]) => '- `' + k + '` — ' + n + ' step(s)')),
    '',
    '## PRESSES WITH NO OBSERVABLE EFFECT', '',
    '*Not the same as a dead control.* This walk can see the era, the phase, the spine step, the',
    'queue mode, the ledger size and the set of live controls — so a press that only changes',
    'something DRAWN (a profile chip selected, a page turned inside a modal) reads as "nothing"',
    'here even though it worked. Read this list as a place to look, not as a defect list.', '',
    dead.length
      ? dead.map((p) => '- step ' + p.step + ': `' + p.target + '` on ' + p.surface).join('\n')
      : '- none: every press moved something this walk can see',
    '',
    '## CONTROLS PUBLISHED AS LIVE THAT DID NOTHING', '',
    '*Pressed, and not one pixel or field changed.* The usual cause is a modal above them: while',
    'a provotype is open `os.handleClick` delegates every click to it and returns, yet the kit',
    'underneath goes on registering its NEXT rect and IRC its replies. Those controls are',
    'advertised as reachable while being physically unreachable — the same class as a button',
    'drawn where nothing can press it.', '',
    inert.length
      ? [...new Map(inert.map((d) => [d.surface + ':' + d.id, d])).values()]
        .map((d) => '- `' + d.id + '` on ' + d.surface + ' (' + d.era + '/' + d.phase + ')').join('\n')
      : '- none: every published control did something',
    '',
    '## SURFACES THAT OWN NO HIT RECTS AT ALL', '',
    '*Structural, not a snapshot.* These own the screen while open and hold no rect field of any',
    'kind — their button geometry is computed a second time inside `handleClick`, so the numbers',
    'exist twice and nothing can check the copies agree. `kit`\'s two copies had already drifted by',
    '40 px. A surface that is merely EMPTY right now (Caleb between beats, L while she speaks) is',
    'not listed here — that is the piece working, and an earlier version of this report wrongly',
    'conflated the two. The walker finds these by sweeping; the coordinate it found is below.', '',
    silentFound.length
      ? silentFound.map((n) => '- `' + n + '`' +
        (sweptAt[n] ? ' — its control was at ' + sweptAt[n].join(', ') + ' on the OS canvas' : '')).join('\n')
      : '- none encountered',
    '',
    '## CONSOLE', '',
    noise.length ? noise.map((c) => '- `' + c + '`').join('\n') : '- clean',
    '',
    '## STOPPED BECAUSE', '',
    log.filter((l) => l.kind === 'stop')
      .map((l) => '- ' + l.what + ' (at `' + l.era + '` / `' + l.phase + '` / `' + l.spine + '`)').join('\n')
      || '- ran to the step limit without stopping'
  ].join('\n');
  writeFileSync(join(OUT_DIR, 'WALK_' + stamp + '.md'), md + '\n');

  console.log('\nwrote docs/reinterp/WALK_' + stamp + '.{json,md} — ' +
    presses.length + ' presses, reached ' + final.era);
  await browser.close();

  /**
   * ⚑ `--require-close` — THE REGRESSION GATE (S103d), and it deliberately
   * asserts ONE thing.
   *
   * A scheduled run on a shared cloud machine cannot honestly assert timing:
   * this piece has beats measured in minutes, rendered through swiftshader on
   * contended hardware, and a check that failed on drift would cry wolf until
   * somebody disabled it. What such a machine CAN answer is the question this
   * project keeps getting wrong and cannot see: **is the ending still
   * reachable by pressing things?**
   *
   * `spine: done` is the honest signal — it is set only through the conductor's
   * `onClose()`, which only the Close's own restart can reach. Nothing else in
   * the piece can fake it.
   */
  if (flag('require-close') !== undefined || process.argv.includes('--require-close')) {
    if (final.spine === 'done') {
      console.log('✓ reachability: the walk reached the Close (spine: done).');
    } else {
      console.error(
        '\n⚑ REACHABILITY REGRESSION: the walk did NOT reach the Close.\n' +
        '  final era ' + final.era + ' / spine ' + final.spine + ' after ' +
        presses.length + ' presses.\n' +
        '  Read the report\'s "PUBLISHED BUT UNREACHABLE" section first — it names\n' +
        '  every control the piece registered that could not be aimed at, and why.\n');
      process.exit(1);
    }
  }
}

main().catch((e) => { console.error('walk failed:', e); process.exit(1); });
