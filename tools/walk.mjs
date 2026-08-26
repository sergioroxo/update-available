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
 *  · **It is autonomous, not scripted.** A scripted path only finds the faults
 *    you already expected. This one reads the live state each step and chooses,
 *    so it walks into content nobody remembered was there.
 *
 * ⚑ THE ONE SURFACE THAT PUBLISHES NOTHING is the update ritual (`UpdateApp`
 * computes its rects inline inside `handleClick`). Rather than copy that
 * geometry here — a duplicate that would rot silently, which is the failure mode
 * this whole tool exists to catch — the walker SWEEPS: it presses a coarse grid
 * until the state moves, and records the point that worked. That is also how a
 * person finds a button, and the sweep's result is itself a reportable finding.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const flag = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
};
const PORT = Number(flag('port', 3000));
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
  /understand|continue|^ok$|^okay$|next|read.?on|agree|proceed|begin|start$|enter|hello|open|insert|play/i,
  /apply|send|confirm|done|finish|accept|update.?now|sign.?in|signin|allow|unlock/i,
  /^task-|^tile-|^consent|^board|^group$|^inbox$|^link$|^notification$/i
];
const FORBIDDEN = /^r-leave$|quit|^exit$|restart|decline|pause|mute/i;
const LAST_RESORT = /^leave$|not.?now|remind|skip|cancel|^back|^dismiss$|^close$/i;

async function main() {
  let puppeteer;
  try {
    puppeteer = (await import(join(ROOT, 'node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js'))).default;
  } catch {
    console.log('puppeteer-core is not installed (optional devDependency) — skipping.');
    process.exit(0);
  }
  mkdirSync(SHOT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'],
    defaultViewport: { ...VIEW, deviceScaleFactor: 1 }
  });
  const page = await browser.newPage();
  const noise = [];
  page.on('pageerror', (e) => noise.push(`PAGEERROR ${String(e).slice(0, 180)}`));
  page.on('console', (m) => {
    const t = m.text();
    if (/ASSERT|Invalid batch|Uncaught|TypeError/i.test(t)) noise.push(t.slice(0, 180));
  });

  const log = [];
  const note = (kind, detail) => {
    log.push({ step: log.length, kind, ...detail });
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

  /**
   * ⚑ ONE READ PER STEP, and it does the projection in-page.
   * Every pressable thing in the piece comes back with a page point already
   * computed, so the walker never has to know which mesh a surface is on.
   */
  const probe = () => page.evaluate(({ VW, VH }) => {
    const os = window.__os;
    const app = window.__app;
    const q = window.__graceQueue ? window.__graceQueue() : null;
    const root = app.root;
    let cam = null;
    root.forEach((e) => { if (e.camera && e.enabled) cam = e; });
    const Vec3 = root.getPosition().constructor;

    // ⚑ WHY, NOT JUST WHETHER. "no controls" and "controls I cannot aim at" are
    // completely different findings — the first is a hole in the piece, the
    // second is a hole in this tool — and a log that conflates them is worth
    // nothing. Every rejection carries its reason from here on.
    let lastWhy = '';
    const toPage = (wx, wy, wz) => {
      const p = cam.camera.worldToScreen(new Vec3(wx, wy, wz));
      if (p.z <= 0) { lastWhy = 'behind the camera'; return null; }
      if (p.x < 4 || p.y < 4 || p.x > VW - 4 || p.y > VH - 4) {
        lastWhy = 'off-screen at ' + Math.round(p.x) + ',' + Math.round(p.y);
        return null;
      }
      return [p.x, p.y];
    };

    /** the exact inverse of era3Devices.ts's hitPlane(), for any oriented plane */
    const onPlane = (entName, lx, ly, LW, LH) => {
      const ent = root.findByName(entName);
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
    const WS = { w: 676, h: 390 };
    const PH = { w: 180, h: 360 };
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
      const visor = () => onPlane('era4-visor', lx, ly, OS.w, OS.h);
      const workstation = () => onPlane('era3-device-workstation',
        lx + RITUAL.x, ly + RITUAL.y, WS.w, WS.h);
      const order = os.desktopEra === 'e4' ? [visor, workstation, monitor]
        : os.desktopEra === 'e3' ? [workstation, visor, monitor]
        : [monitor, workstation, visor];
      for (const f of order) { const p = f(); if (p) return p; }
      return null;
    };

    const targets = [];
    const dropped = [];
    const add = (id, surface, r, pt) => {
      const logical = [Math.round(r.x + r.w / 2), Math.round(r.y + r.h / 2)];
      if (pt) targets.push({ id, surface, logical, pt });
      else dropped.push({ id, surface, logical, why: lastWhy || 'unprojectable' });
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
    const collect = (rootObj, maxDepth) => {
      const found = [];
      const seen = new Set();
      const looksLikeRects = (v) => Array.isArray(v) && v.length > 0 && v.every((r) =>
        r && typeof r === 'object' &&
        typeof r.x === 'number' && typeof r.y === 'number' &&
        typeof r.w === 'number' && typeof r.h === 'number' && typeof r.id === 'string');
      const visit = (obj, depth, path) => {
        if (!obj || typeof obj !== 'object' || depth > maxDepth || seen.has(obj)) return;
        seen.add(obj);
        if (seen.size > 400) return;
        // a sub-app that says it is closed owns nothing on screen
        if (path && (obj.open === false || obj.visible === false)) return;
        for (const k of Object.keys(obj)) {
          let v;
          try { v = obj[k]; } catch { continue; }
          if ((k === 'hits' || k === 'rects') && looksLikeRects(v)) {
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
    // ⚑ the modal sub-apps that own the screen but publish NO rects — the kit
    // (Era 1's booklet, the whole spine of the era) and the update ritual both
    // compute their button geometry inline inside `handleClick`. Naming them
    // here is not a list to maintain: it is a report of which live thing the
    // walker is about to have to find by sweeping.
    const silent = [];
    for (const k of Object.keys(os)) {
      let v; try { v = os[k]; } catch { continue; }
      if (v && typeof v === 'object' && v.open === true && typeof v.handleClick === 'function'
        && !osGroups.some((g) => g.path === k)) silent.push(k);
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

    // the phone as an OBJECT — it is picked up, not squinted at (S79)
    const phoneEnt = root.findByName('era3-device-phone');
    if (phoneEnt && phoneEnt.enabled) {
      const c = phoneEnt.getPosition();
      const pt = toPage(c.x, c.y, c.z);
      if (pt) targets.push({ id: '(pick up the phone)', surface: 'prop', logical: null, pt });
    }

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
      const t = document.createElement('canvas');
      t.width = 24; t.height = 18;
      const tx = t.getContext('2d');
      tx.drawImage(c, 0, 0, 24, 18);
      const d = tx.getImageData(0, 0, 24, 18).data;
      let h = 2166136261;
      for (let i = 0; i < d.length; i += 4)
        h = Math.imul(h ^ (d[i] + d[i + 1] * 3 + d[i + 2] * 7), 16777619) >>> 0;
      return h.toString(36);
    };
    const canvases = window.__era3Devices ? window.__era3Devices() : {};
    const screenHash = hashOf(os.canvas) + '/' +
      hashOf(canvases.workstation) + '/' + hashOf(canvases.phone);

    const led = window.__ledger ? window.__ledger() : null;
    const ledCount = led ? Object.keys(led).reduce(
      (n, k) => n + (Array.isArray(led[k]) ? led[k].length : 0), 0) : 0;
    const pose = window.__camPose ? window.__camPose() : null;

    return {
      phase: os.phase, era: os.desktopEra,
      spine: window.__spine ? window.__spine().step : null,
      driven: !!(pose && pose.driven),
      qMode: q ? q.mode : null,
      ritualOpen: !!(os.updateApp && os.updateApp.visible),
      rawOsHits: (os.hits || []).length,
      screenHash, surfaces, silent,
      targets, dropped, moves, ledCount, ledger: led
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

  const press = async (t, before) => {
    await doPress(t.pt);
    const after = await probe();
    note('press', {
      target: t.id, surface: t.surface, logical: t.logical,
      page: [Math.round(t.pt[0]), Math.round(t.pt[1])],
      era: after.era, phase: after.phase, spine: after.spine, qMode: after.qMode,
      ledgerDelta: after.ledCount - before.ledCount,
      changed: moved(before, after)
    });
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
  const pick = (targets, tried, seen) => {
    const live = targets.filter((t) =>
      t.surface !== 'prop' && !FORBIDDEN.test(t.id) && !tried.has(t.surface + ':' + t.id));
    if (!live.length) return null;
    const tier = (t) => {
      if (LAST_RESORT.test(t.id)) return 90;
      const i = PREFER.findIndex((rx) => rx.test(t.id));
      return i >= 0 ? i : 50;
    };
    // ⚑ BREADTH FIRST, and it is what finally got the walk out of Era 1's
    // desktop. Two optional provotypes sit there beside the narrative's own
    // icons, and a walker choosing by preference alone re-entered the same two
    // apps a hundred times while the spine never moved once. Ranking by how
    // often a control has been pressed ACROSS THE WHOLE RUN means anything
    // untouched outranks anything already explored — so the walk spreads out
    // through the room's content instead of wearing a groove in one corner.
    return live.slice().sort((a, b) =>
      tier(a) - tier(b) ||
      (seen.get(a.id) || 0) - (seen.get(b.id) || 0))[0];
  };
  /** the screen's identity: what is drawn, plus what can be pressed on it */
  const screenOf = (st) =>
    st.era + '|' + st.phase + '|' + st.qMode + '|' + st.screenHash + '|' +
    st.targets.map((t) => t.surface + ':' + t.id).join();
  /** ⚑ real forward motion, as opposed to merely a different picture. The
   *  pixel hash makes signatures plentiful, so loop detection cannot rely on
   *  them alone — this is the coarse thing that must eventually move, and a
   *  long run of presses without it moving is the walk going nowhere. */
  const progressOf = (st) =>
    st.era + '|' + st.phase + '|' + st.spine + '|' + st.qMode + '|' + st.ledCount;

  // ── the walk ──
  let s = await probe();
  note('seated', { era: s.era, phase: s.phase, spine: s.spine, what: s.targets.length + ' live controls' });
  let stalls = 0;
  /** screen signature -> the ids already pressed there, kept for the whole run */
  const history = new Map();
  const visits = new Map();
  let progress = progressOf(s);
  let sinceProgress = 0;
  /** how many times each control has been pressed in the whole run */
  const seen = new Map();
  const memory = (sig) => {
    if (!history.has(sig)) history.set(sig, new Set());
    return history.get(sig);
  };

  for (let i = 0; i < MAX_STEPS; i++) {
    if (s.driven) { await wait(1600); s = await probe(); continue; }   // a travelling is playing

    const sig = screenOf(s);
    visits.set(sig, (visits.get(sig) || 0) + 1);
    if (visits.get(sig) > 25) {
      note('stop', {
        what: 'THE WALK IS LOOPING: this same screen has come round 25 times and ' +
          'every control on it has been pressed — there is no way onward from here',
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
        what: name + ' is live, modal and publishes no hit rects — sweeping for its controls',
        era: s.era, phase: s.phase, spine: s.spine
      });
      s = await sweep(s, name);
      break;
    }
    if (s.silent.length) continue;

    const tried = memory(sig);
    let t = pick(s.targets, tried, seen);
    // every option on this screen has been taken before: it is a genuine cycle,
    // so start the screen over rather than standing still
    if (!t && s.targets.some((x) => !FORBIDDEN.test(x.id))) {
      tried.clear();
      note('recycle', { what: 'every control on this screen has been pressed before — starting it over',
        era: s.era, phase: s.phase, spine: s.spine });
      t = pick(s.targets, tried, seen);
    }
    if (t) {
      stalls = 0;
      tried.add(t.surface + ':' + t.id);
      seen.set(t.id, (seen.get(t.id) || 0) + 1);
      const after = await press(t, s);
      // a press that moved nothing is a finding, not a retry cue — but it may
      // still have moved something this probe cannot see (a chip selected, an
      // icon chosen), so the memory above is what keeps the walk moving on.
      s = (!moved(s, after) && s.ritualOpen) ? await sweep(after, null) : after;
      const p = progressOf(s);
      if (p !== progress) { progress = p; sinceProgress = 0; } else sinceProgress += 1;
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
          memory(screenOf(s)).size + ' already tried, ' + s.moves.length + ' markers',
        era: s.era, phase: s.phase, spine: s.spine, qMode: s.qMode,
        dropped: s.dropped
      });
      if (stalls >= 14) {
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
      const before = screenOf(s);
      s = await probe();
      if (screenOf(s) !== before) stalls = 0;   // it moved on its own; keep going
    }
  }

  const final = await probe();
  note('end', { what: 'walk finished', era: final.era, phase: final.phase, spine: final.spine });
  await page.screenshot({ path: join(SHOT_DIR, 'walk_end.png') });

  // ── the deliverable ──
  const stamp = new Date().toISOString().slice(0, 10);
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

  writeFileSync(join(OUT_DIR, 'WALK_' + stamp + '.json'), JSON.stringify({
    when: new Date().toISOString(), port: PORT, viewport: VIEW,
    steps: log.length, presses: presses.length,
    reachedEra: final.era, spine: final.spine,
    ledger: final.ledger, console: noise, log
  }, null, 1));

  const md = [
    'STATUS: live', '',
    '# THE WALK — ' + stamp, '',
    '*Generated by `tools/walk.mjs`: click-only from the entrance. No `?era=`, no debug jump,',
    'no `debugBeat`, no `__requestMove`. `&debug=1` is used to READ probes and never to press.*', '',
    '**Reached** `' + (final.era || '—') + '` · spine `' + (final.spine || '—') + '` · ' +
    '**' + presses.length + ' presses** over ' + log.length + ' steps · ' +
    dead.length + ' press' + (dead.length === 1 ? '' : 'es') + ' changed nothing', '',
    '## THE PATH', '',
    '| # | control | surface | on surface | on screen | era | phase | ledger |',
    '|---|---|---|---|---|---|---|---|',
    ...presses.map((p) => '| ' + p.step + ' | `' + p.target + '` | ' + (p.surface || '') + ' | ' +
      (p.logical ? p.logical.join(', ') : '—') + ' | ' + (p.page ? p.page.join(', ') : '—') + ' | ' +
      (p.era || '') + ' | ' + (p.phase || '') + ' | ' + (p.ledgerDelta > 0 ? '+' + p.ledgerDelta : '') + ' |'),
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
    '## SURFACES THAT PUBLISH NO HIT RECTS', '',
    '*Found by the walk, not by reading the code.* These own the screen while they are open and',
    'compute their button geometry inline inside `handleClick`, so nothing — not this tool, not',
    'any future check — can confirm their controls are reachable. The walker had to find each one',
    'by sweeping the canvas, and the coordinate it found is the one recorded below.', '',
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
}

main().catch((e) => { console.error('walk failed:', e); process.exit(1); });
