#!/usr/bin/env node
/**
 * SHOTS — the capture rig (L3) and the assertions over it (L4).
 * Session 72. Design: docs/REINTERP_THE_AUDIT_SYSTEM_2026-08-04.md.
 *
 *     node tools/shots.mjs audit            # L3 + L4, one report, one exit code
 *     node tools/shots.mjs sweep --tag after
 *     node tools/shots.mjs comfort          # the envelope, alone
 *     node tools/shots.mjs blank shots-after
 *     node tools/shots.mjs verify           # cross-check the maths vs the engine
 *     node tools/shots.mjs zoom --width 375 --height 812   # S80, mode 3's legibility
 *
 * ⚑ WHY THIS FILE EXISTS AT ALL. The capture rig was written three times — S69,
 * S70 part 2, S71 — and thrown away three times, because each session built it
 * in its own scratchpad. Every check this repo had was static or geometric;
 * every fault that actually reached Sérgio was experiential, the kind you only
 * find by rendering a frame and looking at it. Nine of them, zero coverage.
 * `tools/harness/` is that salvage; this is the consolidation of it, and each
 * assertion below names the fault that paid for it.
 *
 * ⚑ THE FOUR RULES IT IS BUILT ON, all taken from checks that already survived
 * in this repo rather than from taste:
 *
 *  1. RATCHETS, NOT PERFECTION. Every numeric check starts at today's MEASURED
 *     value and fails on growth. check-spec's palette ratchet went 157 → 33
 *     because it nagged instead of blocking. A check that fails on day one gets
 *     disabled on day one. Each baseline below carries the session that
 *     measured it. The ONE exception is the comfort envelope, which is a fixed
 *     law and fails outright — see COMFORT below for why it earns that.
 *  2. ONE COMMAND. `npm run audit`. This tool starts its own dev server if one
 *     is not already answering, and stops it again.
 *  3. REPORT, DON'T REDECORATE. Nothing here edits the piece. Measurements are
 *     findings; anything that is a composition call is printed as a PROPOSAL.
 *  4. CROSS-CHECK BEFORE TRUSTING. `room-audit.mjs` was verified against the
 *     live engine to 0.00000 m before a single number was believed, and that is
 *     why its findings held. `node tools/shots.mjs verify` does the same for
 *     this file's projection maths (against PlayCanvas's own worldToScreen) and
 *     for its velocity model (against the live rig). If an assertion disagrees
 *     with the engine, the assertion is wrong until proven otherwise.
 *
 * ⚑ IT HOLDS NO CAMERA NUMBERS. The salvaged sweep carried a COPY of app.ts's
 * seats and the five S67 overlooks, which was correct the day it was written
 * and had no way of staying correct. Every pose here is read at runtime from
 * `window.__poses` (src/engine/app.ts's CAMERA_POSES, published by the debug
 * panel), and every prop box from `tools/room-audit.mjs --boxes`, which is
 * itself engine-verified. The only authored data in this file is the seat →
 * subject map, which is a statement of intent that cannot be derived from
 * geometry — see SEAT_SUBJECTS.
 *
 * ⚑ OPTIONAL BY CONSTRUCTION. `puppeteer-core` is a devDependency and the
 * system Chrome is not vendored, so `npm test` must never need either. With
 * Chrome or puppeteer absent this exits 0 with a plain message saying which
 * checks did not run. A skipped check named out loud is worth more than a check
 * that always passes.
 */
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import zlib from 'node:zlib';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ═══ THE RATCHETS ══════════════════════════════════════════════════════════
// Every number below was MEASURED on the run that introduced it, on this
// machine, in headless Chrome at 1280×860. Lower them when they drop; never
// raise one without a line saying which session regressed and why.

/**
 * ⚑ THE COMFORT ENVELOPE — the one check here that is a LAW and not a ratchet.
 *
 * CLAUDE.md's single bodily ask is that you turn but never walk, so every
 * driven camera leg in the piece is artificial locomotion and is held to the
 * envelope S53 measured for the opening descent. It does not ratchet because a
 * ratchet would mean accepting today's number, and today's number is the one
 * thing here that can make a person ill: E3→E4 shipped at 3.667 m/s — 8.5× this
 * — under a comment describing a rise the code never performed, and nothing in
 * the repo noticed for weeks.
 *
 * ⚑ EVERY FIGURE IS DESKTOP-MEASURED. A11, the in-headset pass, has still never
 * run. Passing this check is not the same as being comfortable in a headset.
 */
const COMFORT_MPS = 0.43;
const COMFORT_DPS = 9.1;
/**
 * Sampling slack. The rig is differentiated frame to frame, so a single long
 * frame (a GC pause, a cascade's first frame) divides a normal step by a short
 * dt and reads as a spike that no eye ever saw. The envelope is applied to a
 * 5-frame moving average as well as to the raw peak; the RAW peak is reported
 * always, and only the SUSTAINED figure fails the build. 5 frames ≈ 70 ms at
 * 72 Hz — far shorter than any leg, far longer than one hitch.
 */
const COMFORT_WINDOW = 5;

/**
 * DRAW-CALL CEILING. CLAUDE.md's Quest budget is ≤60. S71 measured the two
 * relocations after the doorplates were cut — E2→E3 at 57, E3→E4 at 62 (5
 * samples of 367 over budget, ~0.6 s of a 42.5 s move) — and this run
 * reproduces both exactly.
 *
 * ⚑ The baseline is 67, not 62, because S72 measured a leg S71 never did: the
 * ENTRANCE peaks at 67 while the batcher is still settling, i.e. the piece's
 * highest draw-call moment is its first ten seconds, on every run, for every
 * player. It nags downward rather than blocking, exactly like the palette
 * ratchet — the fix that would close the E3→E4 half is a change to the piece's
 * signature cascade effect and is Sérgio's call, not this tool's (S71 P5).
 * Measured: S72, headless 1280×860.
 *
 * ⚑⚑ BUDGET RAISED 60 → 75 by Sérgio, 2026-08-06 ("maybe we should try and push
 * to 75 draw calls, I think that will help"). It is his law to set and this is
 * an informed loosening, not a slip: his own cross-platform research spec puts
 * the Quest 2 target at <80 and Quest 3 at <120, so 75 still keeps real margin
 * under the LOWER of the two — while clearing the entrance (68) and the E3→E4
 * cascade (62), which were over the old 60 and are not defects.
 * ⚑ IT DOES NOT CLEAR THE SEND LEG AT 78. That one stays over budget.
 *
 * ⚑ AND THE RATCHET NOW TRACKS THE REACHABLE PEAK ONLY (68, the entrance after
 * S74's curtain rod). The send legs are EXCLUDED and measured separately: no
 * beat fires that seam, so 78 is unreachable in play — but excluding it from a
 * nag is not blessing it. It is over the new budget too, and whoever wires the
 * first send beat owns bringing it under 75, in the same session as the 6.87
 * m/s comfort violation on the same legs (08 §7, §9).
 */
const DRAW_CALL_BASELINE = 68;
const DRAW_CALL_BUDGET = 75;
/** legs excluded from the RATCHET (never from the report) — see above. */
const DRAW_CALL_LATENT = /send/i;

/**
 * ⚑ BLANK FRAMES. A captured frame with no luminance structure is an unlit
 * block, a dead screen or a mud-brown room — three of Sérgio's own reports
 * ("reads as unlit black blocks", "photographs as brown mud", "Maya's screen is
 * blank at the E4 home seat") collapse into one statistic.
 *
 * The statistic is TILED, not global: a whole frame is almost never flat, but
 * the faults are regional. Each frame is cut into TILE_GRID² tiles, each tile's
 * luminance standard deviation is taken, and a frame's score is the FRACTION of
 * its tiles that are flat. Flagging is on that fraction, so a frame whose
 * subject fills it with nothing (Maya's screen) flags, and a frame with one
 * dark corner does not.
 *
 * ⚑ THE THRESHOLDS ARE MEASURED, NOT GUESSED. See `blank --tune`, which prints
 * the whole distribution; the numbers below were read off the real S72 sweep
 * (see the session log for the histogram they came from), and the tool prints
 * every flagged frame by name so the next session can disagree with them.
 */
const TILE_GRID = 8;
const TILE_FLAT_STD = 2.0;      // 8-bit luminance std within one tile
const FRAME_FLAT_FRACTION = 0.60; // ≥60% of tiles flat ⇒ the frame reads as blank
/**
 * ⚑ ONE, and it is named rather than hidden: `e4_seat-r1-turned` — the E4 view
 * turned to the witness record — scores 0.66 flat at luma 33.7. It is the
 * artefact S71 already characterised: `?era=4` files nothing into the ledger, so
 * the record is in its DORMANT state (correct in play, misleading in a review
 * jump), and E4's own rig is the darkest in the piece by design ("the cold has
 * won"). Two intentional things multiplying, not a fault — but it stays in the
 * report every run rather than being excluded, because "almost always intent"
 * is not "always", and because the day it becomes a real fault this number is
 * what notices.
 *
 * The distribution it was set from (S72, 31 frames): the flagged frame at 0.66,
 * then a clear gap down to 0.53 / 0.50 / 0.41 (Room 1 at E4 — the vacated room,
 * dark on purpose), and everything else at 0.39 or below. `--tune` reprints it.
 */
const BLANK_BASELINE = 1;

/**
 * SUBJECT-IN-FRAME. Each seat declares what it is FOR; the check asserts that
 * thing projects inside the frustum. Baseline is the count of declared subjects
 * currently out of frame — which is not zero, and deliberately so: S71's P3
 * measured every desk sitting 45.7–50.9° below a 21° half-FOV and left it as a
 * framing call for Sérgio ("turning is the mechanic and this may be exactly
 * right"). Those desks are IN the baseline, named in every report, so the open
 * question is re-surfaced by measurement each run instead of re-derived by hand
 * — and any NEW subject leaving frame fails.
 *
 * 6 = three desks counted once per era they are seated in (Daniel's at E2/E3/E4,
 * Vera's at E3/E4, Maya's at E4).
 * ⚑ S107: it was reading 7, and the seventh was not a subject that had drifted
 * out of frame — it was `SEAT_SUBJECTS.r3` still naming a CRT that moved to a
 * shelf in S97 (R1 C-2). Re-declared, not re-baselined: the count is 6 again
 * because the stale line is gone, and the ratchet was NOT raised to meet it.
 * The lesson the number now carries: a declaration going stale and a subject
 * leaving frame are indistinguishable from here, so read the named rows before
 * concluding the piece moved.
 * Measured S72; this run puts them at 44.5°,
 * 48.0° and 41.5° below a 21° half-FOV, which corroborates S71's 45.7–50.9°
 * from a different method (S71 measured to the desk SURFACE, this to the box
 * centre — the centre sits lower, and the two bracket each other as they should).
 * A subject marked `required` is never covered by this ratchet: it fails alone.
 */
const OFF_FRAME_BASELINE = 6;

/** CONSOLE ASSERTS. S71 drove the eight `terminalFrame` batch asserts to zero
 *  by excluding it from the settled batch group. Nothing kept them there. This
 *  one is absolute: zero is the whole point. */
const ASSERT_BASELINE = 0;

// ═══ THE ONE AUTHORED TABLE ════════════════════════════════════════════════
/**
 * ⚑ SEAT → SUBJECT. This is DATA, authored, not inferred — the whole assertion
 * rests on someone having said what a seat is for, and no amount of geometry
 * can say it. Ids are prop ids as `tools/room-audit.mjs` reports them, or one
 * of the two code-resident planes (the live monitor and the witness wall),
 * which are not props at all.
 *
 * The DEVICE seat (r2-phone) declares nothing on purpose: the held
 * screen is placed relative to the camera by construction (era3Devices'
 * holdDevice takes the seat pose as its argument), so it cannot fall out of
 * frame, and asserting on it would test arithmetic rather than composition.
 *
 * `required: false` marks a subject that is EXPECTED out of frame today — the
 * desks of S71's P3. They still get measured and printed every run; they simply
 * sit in OFF_FRAME_BASELINE rather than failing the build on day one.
 */
const SEAT_SUBJECTS = {
  r1: [
    { what: 'the monitor (the piece itself)', kind: 'plane', at: [0, 1.08, 0] },
    { what: "Daniel's desk", kind: 'prop', id: 'deskModel', required: false }
  ],
  'r1-turned': [
    { what: 'the witness record wall', kind: 'plane', at: [0, 1.5, 3.4] }
  ],
  r2: [
    // ⚑ WAS `prop: w_flatPanelScreen`, WHICH NO LONGER EXISTS — 2026-08-24.
    // That prop was a 2 cm box left over from the four-box monitor; once the
    // display plane was fitted to the real mesh it occupied the same space and
    // blacked the content out, so it was deleted. This check then reported
    // MISSING at both E3 and E4 and counted the subject as out of frame, which
    // is how a removal quietly cost the ratchet two. Pointed at the display's
    // own world centre instead — the same `plane` form Room 1's monitor uses,
    // and the thing that actually has to be in frame. Keep it in step with
    // era3Devices' PLACEMENT.workstation.pos.
    { what: "Vera's workstation screen", kind: 'plane', at: [-5.327, 1.045, 0.7] },
    { what: "Vera's desk", kind: 'prop', id: 'w_desk', required: false }
  ],
  r3: [
    // ⚑ WAS `e_crtScreen`, AND THAT CRT LEFT THE DESK — S107, 2026-09-03 (R1
    // finding C-2). S97 moved the machine off Maya's desk and onto the north
    // wall's shelf ("a remembrance to the past"), and S98/S99 put her 2026
    // laptop where it used to sit. This line went on naming the CRT, so the
    // audit measured the seat's resting bearing against an object that is no
    // longer on that bearing: −70.6° horiz off a 29.7° half-FOV. That ONE stale
    // line produced BOTH of the run's subject-in-frame failures (a REQUIRED
    // subject out of frame, and 7 against a ratchet of 6). Nothing had moved
    // wrongly; the declaration had gone stale, exactly the failure mode the
    // `w_flatPanelScreen` note above records for Room 2.
    // ⚑ The CRT is not dropped — it is re-declared at `r3-shelf` below, on the
    // bearing S97 actually placed it for.
    { what: "Maya's laptop", kind: 'prop', id: 'e_laptop' },
    { what: "Maya's desk", kind: 'prop', id: 'e_desk', required: false }
  ],
  /**
   * ⚑ THE QUARTER TURN, where the CRT went (S107). S97's own placement note
   * says it plainly — "the row-1 shelf puts it at eye level where turning finds
   * it" — and the shelf is on Room 3's NORTH wall, i.e. 90° off the seat's
   * resting bearing, not 180°. Measured from the seat: +8.5° vert, +19.4°
   * horiz, 1.27 m. So the seat's subject and the turn's subject are two
   * declarations, not one, and this is the second.
   */
  'r3-shelf': [
    { what: "the CRT kept on the shelf", kind: 'prop', id: 'e_crtScreen' }
  ],
  /**
   * ⚑ `r3-turned` DECLARES NOTHING, and that is the point of adding it. The
   * 180° turn at Maya's seat is the piece's one bodily ask performed in the era
   * that ends it: it shows all three rooms and the ceiling's stars at once, and
   * R1's finding C-1 measured it at 197 draw calls (not the 141 on record).
   * This file's own §"S88" note complains that no sampled pose was ever a
   * TURNED E4 seat — so the pose is swept here, to be LOOKED at and to have its
   * draw calls read, while declaring no subject: a vista is not a subject, and
   * asserting one would be inventing intent the piece has not stated.
   */
  'r3-turned': []
};

/**
 * ⚑ THE DERIVED BEARINGS — the only poses in this file the engine does not
 * publish, and they are derivations rather than numbers. `app.ts`'s
 * CAMERA_POSES has one seat per room plus `r1-turned`; Room 3 has no turned
 * entry, and this file may not add one to the engine. So a turn is expressed
 * the only way that cannot rot: as a yaw offset from the published seat. Move
 * the r3 seat in app.ts and both of these move with it.
 * ⚑ Not new geometry, not a camera number — an offset in degrees.
 */
const DERIVED_SEATS = {
  'r3-shelf': { from: 'r3', yawOffset: 90 },   // the quarter turn, to the shelf
  'r3-turned': { from: 'r3', yawOffset: 180 }  // the turn, to the three-room vista
};

/** add the derived bearings to a published pose table, in place and idempotently */
function withDerivedSeats(poses) {
  if (!poses?.seats) return poses;
  for (const [id, d] of Object.entries(DERIVED_SEATS)) {
    const base = poses.seats[d.from];
    if (!base || poses.seats[id]) continue;
    poses.seats[id] = { ...base, yaw: base.yaw + d.yawOffset };
  }
  return poses;
}

/** which room-audit space state each era folds to */
const ERA_STATE = { 2: 'r2', 3: 'r3', 4: 'r4' };
/** which seats exist per era — E2 keeps the walls up, E3 opens Rooms 1+2,
 *  E4 adds Room 3 (cluster.ts's own gating; the sweep mirrors it) */
const ERA_SEATS = {
  1: ['r1', 'r1-turned'],
  2: ['r1', 'r1-turned'],
  3: ['r1', 'r1-turned', 'r2'],
  4: ['r1', 'r1-turned', 'r2', 'r3', 'r3-shelf', 'r3-turned']
};

// ═══ CLI ═══════════════════════════════════════════════════════════════════

const argv = process.argv.slice(2);
const MODE = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'audit';
const POSITIONAL = argv.slice(1).filter((a) => !a.startsWith('--'));
const flag = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};
const has = (name) => argv.includes(`--${name}`);

if (MODE === 'help' || has('help') || has('h')) {
  console.log(`
tools/shots.mjs — the capture rig (L3) and the assertions over it (L4).

  audit      L3 capture + L4 assertions, one report, one exit code   [default]
  sweep      every seat × era + the overlooks that belong to that era
  devices    the offscreen tablet/phone canvases, driven through real beats
  sheet      a labelled contact sheet from a shots dir
  blank      re-score a saved sweep for blank frames        (OFFLINE — no browser)
  framing    re-check subject-in-frame from a saved sweep    (OFFLINE — no browser)
  comfort    the comfort envelope + the draw-call peak, alone
  verify     ⚑ cross-check this tool's maths against the live engine

  --port N | $SHOTS_PORT    dev server port (5173). Started automatically if down.
  --chrome PATH | $CHROME   browser. Absent ⇒ skip with a message and exit 0.
  --tag NAME  --out DIR     output (default out/shots-<tag>)
  --width N   --height N    viewport (1280×860)
  --tune                    blank: print the whole distribution, not the worst five
  --json                    audit: also write _report.json
`);
  process.exit(0);
}

const PORT = Number(flag('port', process.env.SHOTS_PORT ?? 5173));
const TAG = String(flag('tag', 'audit'));
/** ⚑ under `out/`, which .gitignore already calls "review artifacts …
 *  regenerable". A sweep is 30 MB of PNGs; writing it to the repo root (what
 *  the salvage did) puts it in every `git status` from then on. */
const OUT = path.resolve(ROOT, String(flag('out', `out/shots-${TAG}`)));
const VIEWPORT = { width: Number(flag('width', 1280)), height: Number(flag('height', 860)) };
const AS_JSON = has('json');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * ⚑ THE CHROME PATH, parameterised (it was macOS-only in the salvage).
 * Order: --chrome, then $CHROME / $CHROME_PATH / $PUPPETEER_EXECUTABLE_PATH,
 * then the usual install locations for this platform. Nothing is downloaded and
 * nothing is installed: if none of these exists we skip, we do not fetch.
 */
function resolveChrome() {
  const explicit = flag('chrome') ?? process.env.CHROME ?? process.env.CHROME_PATH
    ?? process.env.PUPPETEER_EXECUTABLE_PATH;
  if (typeof explicit === 'string' && explicit) {
    return fs.existsSync(explicit) ? explicit : null;
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
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

/** set once a dev server has been started BY this tool, so a skip taken after
 *  that point does not leave one running behind it */
let teardown = () => {};

/** a skip is a first-class outcome here, not a failure — see the header */
function skip(why) {
  teardown();
  console.log(`\n⏭  SKIPPED (exit 0): ${why}`);
  console.log('   L1 (npm test) and L2 (tools/room-audit.mjs) need neither a browser');
  console.log('   nor a dev server and are unaffected. Point this at a browser with');
  console.log('   --chrome <path>, or set $CHROME.');
  process.exit(0);
}

// ═══ THE DEV SERVER ════════════════════════════════════════════════════════
// "If it takes three commands and a dev server by hand, it runs once."

/** ⚑ BOTH FAMILIES. Vite binds `[::1]` by default on macOS, so probing only
 *  127.0.0.1 reports a running server as absent — this tool did exactly that on
 *  its first run and went off to start a second one. */
function portOpen(port) {
  const tryHost = (host) => new Promise((resolve) => {
    const s = net.connect({ port, host });
    const done = (v) => { s.destroy(); resolve(v); };
    s.on('connect', () => done(true));
    s.on('error', () => resolve(false));
    setTimeout(() => done(false), 700);
  });
  return Promise.all([tryHost('127.0.0.1'), tryHost('::1')]).then((r) => r.some(Boolean));
}

/** returns a teardown function; spawns vite only if nothing already answers */
async function ensureServer(port) {
  if (await portOpen(port)) {
    console.log(`· dev server: already up on :${port}`);
    return () => {};
  }
  console.log(`· dev server: nothing on :${port} — starting vite`);
  const child = spawn(process.execPath, [
    path.join(ROOT, 'node_modules/vite/bin/vite.js'), '--port', String(port), '--strictPort'
  ], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    await wait(500);
    if (await portOpen(port)) {
      console.log(`· dev server: up on :${port} (started by this tool)`);
      return () => { try { child.kill(); } catch { /* already gone */ } };
    }
    if (child.exitCode !== null) break;
  }
  try { child.kill(); } catch { /* ignore */ }
  skip(`could not start a dev server on :${port} (try --port, or run npm run dev yourself)`);
}

// ═══ PNG — decoded here so frame analysis needs no browser and no deps ═════
/**
 * Enough of the PNG spec to read what Chrome writes: 8-bit, non-interlaced,
 * colour type 2 (RGB) or 6 (RGBA). Deliberately dependency-free and offline, so
 * `shots.mjs blank <dir>` can re-score a sweep that was captured last week — and
 * so the threshold can be tuned against real frames without re-capturing them.
 */
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let off = 8, ihdr = null;
  const idat = [];
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      ihdr = {
        width: data.readUInt32BE(0), height: data.readUInt32BE(4),
        depth: data[8], color: data[9], interlace: data[12]
      };
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (!ihdr) throw new Error('no IHDR');
  if (ihdr.depth !== 8 || ihdr.interlace !== 0 || (ihdr.color !== 2 && ihdr.color !== 6)) {
    throw new Error(`unsupported PNG (depth ${ihdr.depth}, colour ${ihdr.color}, interlace ${ihdr.interlace})`);
  }
  const ch = ihdr.color === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = ihdr.width * ch;
  const out = Buffer.alloc(ihdr.height * stride);
  let p = 0;
  for (let y = 0; y < ihdr.height; y++) {
    const filter = raw[p++];
    const line = raw.subarray(p, p + stride); p += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= ch ? prev[x - ch] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 255;
    }
  }
  return { width: ihdr.width, height: ihdr.height, channels: ch, data: out };
}

/** the tiled flatness score — see the BLANK ratchet block for the reasoning */
function frameFlatness(png) {
  const { width, height, channels, data } = png;
  const tiles = [];
  for (let ty = 0; ty < TILE_GRID; ty++) {
    for (let tx = 0; tx < TILE_GRID; tx++) {
      const x0 = Math.floor((tx * width) / TILE_GRID), x1 = Math.floor(((tx + 1) * width) / TILE_GRID);
      const y0 = Math.floor((ty * height) / TILE_GRID), y1 = Math.floor(((ty + 1) * height) / TILE_GRID);
      let n = 0, sum = 0, sumSq = 0;
      for (let y = y0; y < y1; y += 2) {
        for (let x = x0; x < x1; x += 2) {
          const i = (y * width + x) * channels;
          // Rec. 601 luma — the eye's own weighting, not a channel average
          const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          n++; sum += l; sumSq += l * l;
        }
      }
      const mean = sum / n;
      tiles.push({ std: Math.sqrt(Math.max(0, sumSq / n - mean * mean)), mean });
    }
  }
  const flat = tiles.filter((t) => t.std < TILE_FLAT_STD).length;
  const all = tiles.map((t) => t.std);
  const mean = all.reduce((a, b) => a + b, 0) / all.length;
  return {
    flatTiles: flat, tiles: tiles.length, fraction: flat / tiles.length,
    meanStd: mean, minStd: Math.min(...all),
    meanLuma: tiles.reduce((a, t) => a + t.mean, 0) / tiles.length
  };
}

// ═══ GEOMETRY — the projection, stated so `verify` can disprove it ═════════
/**
 * The rig is yaw-then-pitch with no roll (`setLocalEulerAngles(pitch, yaw, 0)`,
 * PlayCanvas' XYZ order), and the camera looks down its own −Z. So world → view
 * is: translate to the eye, un-yaw about +Y, un-pitch about +X.
 * ⚑ Checked against pc.CameraComponent.worldToScreen by `shots.mjs verify`.
 */
function toCameraSpace(pose, p) {
  const dx = p[0] - pose.x, dy = p[1] - pose.y, dz = p[2] - pose.z;
  const cy = Math.cos(-pose.yaw * Math.PI / 180), sy = Math.sin(-pose.yaw * Math.PI / 180);
  const x1 = dx * cy + dz * sy;
  const z1 = -dx * sy + dz * cy;
  const cp = Math.cos(-pose.pitch * Math.PI / 180), sp = Math.sin(-pose.pitch * Math.PI / 180);
  const y2 = dy * cp - z1 * sp;
  const z2 = dy * sp + z1 * cp;
  return { x: x1, y: y2, z: z2 }; // forward is −z
}

/** angles off the view axis, and whether the point sits inside the frustum */
function framing(pose, p, fovDeg, aspect) {
  const c = toCameraSpace(pose, p);
  const depth = -c.z;
  const halfV = (fovDeg / 2) * Math.PI / 180;
  const halfH = Math.atan(Math.tan(halfV) * aspect);
  const vert = Math.atan2(c.y, depth) * 180 / Math.PI;   // + is above centre
  const horiz = Math.atan2(c.x, depth) * 180 / Math.PI;  // + is right of centre
  return {
    depth, vert, horiz,
    halfV: halfV * 180 / Math.PI, halfH: halfH * 180 / Math.PI,
    inFrame: depth > 0.05
      && Math.abs(vert) <= halfV * 180 / Math.PI
      && Math.abs(horiz) <= halfH * 180 / Math.PI
  };
}

const shortAngle = (a) => ((((a % 360) + 540) % 360) - 180);

// ═══ THE PAGE ══════════════════════════════════════════════════════════════

async function launch(chrome) {
  let puppeteer;
  try {
    puppeteer = (await import('puppeteer-core')).default;
  } catch {
    skip('puppeteer-core is not installed (it is an OPTIONAL devDependency — `npm i -D puppeteer-core`)');
  }
  return puppeteer.launch({
    executablePath: chrome, headless: true,
    // swiftshader/angle: WebGL has to actually render, headless, for any of
    // this to mean anything. (The salvage found this; it is not optional.)
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'],
    defaultViewport: VIEWPORT
  });
}

/** open a review URL and wait for the app to be alive. `asserts` accumulates
 *  every PlayCanvas ASSERT / invalid-batch line the run emits (L4-5). */
async function openPage(browser, query, asserts = []) {
  const page = await browser.newPage();
  page.on('console', (m) => {
    const t = m.text();
    if (/ASSERT|Invalid batch/i.test(t)) asserts.push(t.slice(0, 160));
  });
  page.on('pageerror', (e) => asserts.push('PAGEERROR ' + String(e).slice(0, 160)));
  await page.goto(`http://localhost:${PORT}/${query}`, { waitUntil: 'networkidle2', timeout: 60000 });
  // ⚑ ERA 1 HAS A FRONT DOOR AND THE SWEEP COULD NOT OPEN IT. `__poses` only
  // exists once the room is built, and at E1 the room is not built until the
  // player logs in past the pre-fiction panel — so `sweep` timed out on era 1
  // and era 1 was simply left out of the list, which is how the piece's OPENING
  // room came to be the one room no review frame has ever shown. (The comfort
  // pass already knew this; it clicks the same button. The two paths just never
  // shared the knowledge.) Later eras enter past the panel and no-op here.
  // ⚑ Test for the button's EXISTENCE, not for it being enabled: the panel holds
  // it disabled for the 4 s ethics delay, so an enabled-check run immediately
  // after goto is always false and falls straight through to a 30 s timeout.
  // The delay is a deliberate part of the piece, and the tool has to wait it out
  // exactly as a person does.
  const doorBtn = await page.$$eval('button', (bs) =>
    bs.some((b) => (b.textContent || '').includes('Log in'))).catch(() => false);
  if (doorBtn) {
    await page.waitForFunction(() => [...document.querySelectorAll('button')]
      .some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 30000 }).catch(() => {});
    await clickPanel(page, 'Log in');
  }
  await page.waitForFunction(() => window.__poses !== undefined, { timeout: 30000 });
  await wait(6000); // models, batching, the first settled frames
  return page;
}

/** the per-frame recorder: one rAF loop, read out in one go. Polling from node
 *  at 120 ms (what the salvage did) cannot see a leg's peak; this can.
 *  Field 0 is the MOVE's clock, not the wall's — see `t` in app.ts's __camPose. */
const RECORDER = () => {
  const w = window;
  w.__rec = [];
  w.__recOn = true;
  const tick = () => {
    if (!w.__recOn) return;
    const p = w.__camPose();
    w.__rec.push([p.t, p.x, p.y, p.z, p.pitch, p.yaw, p.seq, p.driven ? 1 : 0, w.__drawCalls ?? 0, p.dur]);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

/**
 * Differentiate a recording into per-leg peaks.
 *
 * ⚑ ONLY PAIRS THAT SHARE A LEG ID ARE MEASURED, and that is the difference
 * between a check that works and one that gets switched off. A blink jump and
 * endRelocation's own seat snap both move the camera metres inside one frame,
 * legitimately — a CUT is not locomotion. Differencing across them reports
 * thousands of m/s. `seq` (src/engine/app.ts's camMoveSeq) changes at every leg
 * boundary and every cut, so a pair that does not share it is discarded.
 */
function differentiate(rec) {
  const legs = new Map();
  for (let i = 1; i < rec.length; i++) {
    const a = rec[i - 1], b = rec[i];
    if (a[6] !== b[6]) continue;      // different leg (or a cut) — not one motion
    if (!a[7] || !b[7]) continue;     // not driven: the player is simply sitting
    const dt = b[0] - a[0];           // the MOVE's clock (app dt), not the wall's
    if (dt <= 0) continue;
    const d = Math.hypot(b[1] - a[1], b[2] - a[2], b[3] - a[3]);
    // yaw is compared through the shortest signed path (camYaw is unwrapped and
    // can run past 360 — startCamMove adds a signed delta rather than clamping)
    const dyaw = Math.abs(shortAngle(b[5] - a[5]));
    const dpitch = Math.abs(b[4] - a[4]);
    const k = String(b[6]);
    if (!legs.has(k)) legs.set(k, { seq: b[6], samples: [], chord: 0, seconds: 0, dur: b[9] });
    const L = legs.get(k);
    // ⚑ the ANGULAR figure is max(|Δyaw|, |Δpitch|)/dt, not their vector sum.
    // The repo's own comfort arithmetic is stated in yaw (cluster.ts: "1.5 × 142
    // / 24 = 8.88 °/s"), yaw about the vertical axis is the rate that drives
    // vection, and pitch never leads on any leg here — so this reproduces the
    // number the piece was designed against instead of inventing a new one.
    L.samples.push({ mps: d / dt, dps: Math.max(dyaw, dpitch) / dt, yawps: dyaw / dt, dt });
    L.chord += d;
    L.seconds += dt;
  }
  // A moving average over COMFORT_WINDOW frames as well as the raw peak: with
  // the move's own clock the two now agree closely, and the gap between them is
  // itself worth printing — a large one means the recording is coarse, not that
  // the curve is violent.
  for (const L of legs.values()) {
    const smooth = (key) => {
      let worst = 0;
      for (let i = 0; i + COMFORT_WINDOW <= L.samples.length; i++) {
        let num = 0, den = 0;
        for (let j = i; j < i + COMFORT_WINDOW; j++) { num += L.samples[j][key] * L.samples[j].dt; den += L.samples[j].dt; }
        worst = Math.max(worst, num / den);
      }
      return L.samples.length < COMFORT_WINDOW
        ? Math.max(0, ...L.samples.map((s) => s[key]))
        : worst;
    };
    L.peakMps = Math.max(0, ...L.samples.map((s) => s.mps));
    L.peakDps = Math.max(0, ...L.samples.map((s) => s.dps));
    L.sustainedMps = smooth('mps');
    L.sustainedDps = smooth('dps');
    L.frames = L.samples.length;
    delete L.samples;
  }
  return [...legs.values()].filter((L) => L.frames >= 3 && L.chord > 0.01);
}

/** click a debug-panel button by its label (the panel is in the DOM even when
 *  collapsed — this is the same real handler a reviewer's click runs) */
async function clickPanel(page, label) {
  return page.evaluate((a) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes(a));
    if (!b) return null;
    b.click();
    return b.textContent.trim();
  }, label);
}

// ═══ L3 · THE CAPTURE ══════════════════════════════════════════════════════

/**
 * The visual sweep: every seat × era × room, plus the five S67 overlooks, plus
 * the two Room-2 device seats driven by a REAL marker move (the held read is
 * the side effect and it is the point — a camera probe would put the camera in
 * the right place with the tablet still lying on the bed).
 */
/**
 * ⚑ WHICH OVERLOOKS BELONG TO WHICH ERA, and this is a correctness fix, not a
 * convenience. The salvaged sweep photographed all five overlooks at all three
 * eras, and the S72 run flagged three of them as blank frames: at a settled
 * `?era=2` the walls are still up, so `look-B-open` (x −2.30) and `look-C-cross`
 * (x +2.30) put the camera OUTSIDE the closed room and photograph the void.
 * That is not a fault in the build — it is a pose being photographed in a state
 * it never occurs in, and reporting it as a blank frame would have been the
 * check's first false positive.
 *
 * An overlook occurs in exactly one room state, and the choreography says which:
 * a relocation's RISE happens while the room is still the era you are leaving;
 * its BUILD ends with the room already the era you are arriving in. So the map
 * is derived from the published relocation table — no name list, nothing to rot.
 * (E1 and E2 are the same closed room, so an E1-state overlook is swept at e2,
 * which is the earliest state the review URLs can reach.)
 */
function overlooksFor(poses, era) {
  const named = Object.entries(poses.overlooks);
  const nameOf = (pose) => named.find(([, v]) =>
    v.x === pose.x && v.y === pose.y && v.z === pose.z && v.yaw === pose.yaw)?.[0];
  const out = new Map();
  for (const [key, r] of Object.entries(poses.relocations)) {
    const from = Math.max(2, Number(key.slice(1, 2)));
    const to = Number(key.slice(4, 5));
    for (const [when, leg] of [[from, r.legs[0]], [to, r.legs[1]]]) {
      if (when !== era) continue;
      const n = nameOf(leg.to);
      if (n) out.set(n, leg.to);
    }
  }
  return [...out.entries()];
}

async function sweep(browser, asserts, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const frames = [];
  let poses = null;
  const perf = [];
  // ⚑ [1, 2, 3, 4] — era 1 was MISSING from this sweep until 2026-08-17, and it
  // is the room the piece's problems keep coming from. Every prop Sérgio has
  // reported over five device sessions lives in Room 1 at E1: the duck, the
  // teddy, the tapes, and now the monkey and racket. The sweep photographed
  // Room 1 only as it appears at ERA 2 and later (`e2_look-A-room1`), i.e.
  // already aged, already partly emptied — so the opening room, the first thing
  // every player sees, was never in a review frame at all.
  //
  // ⚑ Same blind-spot class as S88's finding that no sampled pose was ever a
  // TURNED E4 seat (08 §28): the audit was not wrong about what it measured, it
  // simply never looked where the faults were. An audit's coverage list is
  // itself a claim about where bugs can be, and this one quietly asserted that
  // Era 1 could not have any.
  for (const era of [1, 2, 3, 4]) {
    const page = await openPage(browser, `?reinterp=1&era=${era}&debug=1&descent=0`, asserts);
    const p = withDerivedSeats(await page.evaluate(() => window.__poses()));
    poses = p; // identical every era; kept for the offline framing pass
    const shots = [
      ...ERA_SEATS[era].map((k) => [`seat-${k}`, p.seats[k]]),
      ...overlooksFor(p, era)
    ];
    for (const [name, pose] of shots) {
      await page.evaluate((a) => window.__camFree(a[0], a[1], a[2], a[3], a[4]),
        [pose.x, pose.y, pose.z, pose.pitch, pose.yaw]);
      await wait(450);
      const file = path.join(outDir, `e${era}_${name}.png`);
      await page.screenshot({ path: file });
      frames.push({ era, name, file, pose });
    }
    // the device seats: a real move, so the screen comes off the furniture
    if (era >= 3) {
      for (const node of ['r2-phone']) {
        await page.evaluate((n) => window.__requestMove(n), node);
        await wait(2500);
        const file = path.join(outDir, `e${era}_seat-${node}.png`);
        await page.screenshot({ path: file });
        const seat = (p.deviceSeats ?? []).find((d) => d.id === node);
        frames.push({ era, name: `seat-${node}`, file, pose: seat?.pose ?? null });
      }
    }
    perf.push({ era, drawCalls: await page.evaluate(() => window.__drawCalls ?? 0) });
    await page.close();
  }
  fs.writeFileSync(path.join(outDir, '_poses.json'), JSON.stringify(poses, null, 1));
  writeManifest(outDir, frames);
  return { frames, poses, perf };
}

/** the frame index every offline mode reads (`blank`, `sheet`) — written with
 *  repo-relative paths so a shots dir stays portable between checkouts */
function writeManifest(outDir, frames) {
  fs.writeFileSync(path.join(outDir, '_frames.json'),
    JSON.stringify(frames.map((f) => ({ ...f, file: path.relative(ROOT, f.file) })), null, 1));
}

/**
 * ⚑ S80 — `zoom`: THE MODE-3 LEGIBILITY CAPTURE, and it exists because the
 * question it answers is the one look-mode 3 turns on.
 *
 * The piece's UI is a 512×384 pixel-art canvas textured onto a monitor mesh
 * INSIDE the room. On a phone that is a small screen showing a room containing
 * a smaller screen carrying the text. `REINTERP_MODE3_ASSESSMENT` §3.1 says
 * plainly that this **must be measured, not assumed** — and that the answer may
 * not be filling the viewport, because a canvas that takes the viewport is
 * flat-by-tapping and the spatial frame is the piece.
 *
 * So this photographs the same seat at a PHONE viewport across the pinch
 * zoom's whole range (80° out, 42° authored, 30° all the way in), in portrait
 * AND landscape, and reports the measured on-screen height of one canvas pixel
 * at each. Nothing here decides anything: it is a capture, and the reading of
 * it is Sérgio's.
 *
 *     node tools/shots.mjs zoom [--width 375 --height 812] [--era 1|3]
 */
async function zoomLegibility(browser, asserts, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const era = Number(flag('era', 3));
  const rows = [];
  for (const [orient, w, h] of [
    ['portrait', VIEWPORT.width, VIEWPORT.height],
    ['landscape', VIEWPORT.height, VIEWPORT.width]
  ]) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h });
    page.on('console', (m) => { const t = m.text(); if (/ASSERT|Invalid batch/i.test(t)) asserts.push(t.slice(0, 160)); });
    const q = era === 1 ? '?reinterp=1&debug=1&descent=0&home=0' : `?reinterp=1&era=${era}&debug=1&descent=0`;
    await page.goto(`http://localhost:${PORT}/${q}`, { waitUntil: 'networkidle2', timeout: 60000 });
    if (era === 1) {
      // ⚑ ORDER MATTERS: a fresh load is gated by the pre-fiction orienting
      // card, and the engine (and so `__poses`) does not exist until it is
      // dismissed. The review jumps bypass the card, so they wait first.
      // ⚑ and it must be ENABLED, not merely present: the card deliberately
      // holds its buttons disabled for a moment so the content note cannot be
      // skipped instantly (orientingCard.ts), and `.click()` on a disabled
      // button silently does nothing.
      await page.waitForFunction(() => [...document.querySelectorAll('button')]
        .some((b) => /log in/i.test(b.textContent || '') && !b.disabled), { timeout: 30000 });
      await page.evaluate(() => [...document.querySelectorAll('button')]
        .find((b) => /log in/i.test(b.textContent || ''))?.click());
    }
    await page.waitForFunction(() => window.__poses !== undefined, { timeout: 30000 });
    if (era === 1) {
      await page.waitForFunction(() => !!window.__os, { timeout: 30000 });
      // `--beat` picks WHAT is on the monitor while it is photographed. The
      // default is the profile setup, because legibility is a question about
      // TYPE and that screen is the piece's densest: a heading, body copy, six
      // chips and four checkbox rows, all at the 512×384 canvas's own sizes.
      await page.evaluate((b) => window.__os.debugJump(b), String(flag('beat', 'profile')));
    }
    await wait(6000);
    for (const fov of [80, 42, 30]) {
      await page.evaluate((f) => {
        const cam = window.__app.root.findByName('camera');
        cam.camera.fov = f;
      }, fov);
      await wait(350);
      const file = path.join(outDir, `zoom_${orient}_${w}x${h}_fov${fov}.png`);
      await page.screenshot({ path: file });
      // how tall is ONE canvas pixel on this screen? Project the monitor
      // plane's own top and bottom edge and divide by the 384 logical rows.
      const px = await page.evaluate(() => {
        const app = window.__app;
        const cam = app.root.findByName('camera');
        const V = cam.getPosition().constructor;
        const top = cam.camera.worldToScreen(new V(0, 1.08 + 0.15, 0));
        const bot = cam.camera.worldToScreen(new V(0, 1.08 - 0.15, 0));
        return { screenPx: Math.abs(bot.y - top.y), css: app.graphicsDevice.canvas.clientHeight };
      });
      rows.push({ orient, w, h, fov, file, pxPerRow: px.screenPx / 384, monitorPx: px.screenPx });
    }
    await page.close();
  }
  return rows;
}

/** the offscreen device canvases (S70's captures), driven through real beats */
async function devices(browser, asserts, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const page = await openPage(browser, '?reinterp=1&era=3&debug=1&descent=0', asserts);
  await page.waitForFunction(() => window.__era3Devices && window.__era3Devices(), { timeout: 30000 });
  const beat = (b) => page.evaluate((x) => window.__graceQueue().debugBeat(x), b);
  const grab = async (device, name) => {
    const url = await page.evaluate((d) => window.__era3Devices()[d].toDataURL('image/png'), device);
    const buf = Buffer.from(url.split(',')[1], 'base64');
    const file = path.join(outDir, `dev_${name}.png`);
    fs.writeFileSync(file, buf);
    return { era: 3, name: `dev-${name}`, file, pose: null };
  };
  const out = [];

  // ⚑ THE TABLET IS GONE and this pass photographed it — 2026-08-24. Stage 2a
  // removed Era 3's tablet (Sérgio: the era is DESKTOP + PHONE), which deleted
  // `__era3Devices().tablet`, and every frame here was grabbed off that canvas.
  // `grab` therefore died on `undefined.toDataURL` — i.e. THE WHOLE SHOTS AUDIT
  // HAS BEEN CRASHING since that stage, and it went unnoticed because
  // `npm run audit` had also been finding a DIFFERENT project's dev server
  // already listening on the default port and timing out before reaching here.
  // Two independent failures, both silent, on the one tool built to catch what
  // the static checks cannot see. Run it with `--port <the real one>`.
  // ⚑ The `thread*` beats still EXIST (graceQueueLite delegates them to
  // comments.ts) — they simply have no surface to draw on until ERA3_BUILD_PLAN
  // stage 4 rebuilds the comment thread as a desktop task. Photograph them
  // again then; do not photograph them now, or this crashes the same way.
  await wait(3000);
  for (const [b, name] of [
    ['list', 'workstation_list'], ['item7', 'workstation_last_item'],
    ['noa', 'workstation_noa'], ['maltaArrive', 'workstation_malta']
  ]) {
    await beat(b); await wait(900);
    out.push(await grab('workstation', name));
  }
  for (const [b, name] of [
    ['maltaArrive', 'phone_malta'], ['floppy', 'floppy_home'], ['floppyPlay', 'floppy_running']
  ]) {
    await beat(b); await wait(900);
    out.push(await grab('phone', name));
  }
  await page.close();
  return out;
}

/** a labelled contact sheet at 1:1 pixels (these are pixel-art surfaces) */
async function sheet(browser, frames, outFile, scale = 1) {
  const panels = frames.map((f) => ({
    label: f.name,
    data: 'data:image/png;base64,' + fs.readFileSync(f.file).toString('base64')
  }));
  const page = await browser.newPage();
  await page.goto('about:blank');
  const url = await page.evaluate(async ({ panels, scale }) => {
    const imgs = await Promise.all(panels.map((p) => new Promise((res, rej) => {
      const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = p.data;
    })));
    const BAR = 26, PAD = 8, GAP = 8, COLS = Math.ceil(Math.sqrt(imgs.length));
    const w = Math.round(imgs[0].width * scale), h = Math.round(imgs[0].height * scale);
    const rows = Math.ceil(imgs.length / COLS);
    const c = document.createElement('canvas');
    c.width = PAD * 2 + COLS * w + (COLS - 1) * GAP;
    c.height = PAD * 2 + rows * (BAR + h) + (rows - 1) * GAP;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.fillStyle = '#0d0f13'; x.fillRect(0, 0, c.width, c.height);
    imgs.forEach((im, i) => {
      const px = PAD + (i % COLS) * (w + GAP);
      const py = PAD + Math.floor(i / COLS) * (BAR + h + GAP);
      x.fillStyle = '#15181f'; x.fillRect(px, py, w, BAR);
      x.fillStyle = '#e8ecf4'; x.font = '13px "SF Mono", Menlo, monospace'; x.textBaseline = 'middle';
      x.fillText(panels[i].label, px + 6, py + BAR / 2 + 1);
      x.drawImage(im, px, py + BAR, w, h);
    });
    return c.toDataURL('image/png');
  }, { panels, scale });
  fs.writeFileSync(outFile, Buffer.from(url.split(',')[1], 'base64'));
  await page.close();
  return outFile;
}

// ═══ L4 · THE ASSERTIONS ═══════════════════════════════════════════════════

/**
 * ⚑ S81 · THE RATCHET FIX (08 §26). `Math.max(0, ...rec.map(r => r[8]))` took
 * the peak over EVERY sampled frame, warm-up included — S86 measured the
 * entrance at 68 on one run and 76 on an immediate re-run of the same tree,
 * consistent with §26's theory: batching rebakes asynchronously very early in
 * a recording, and whether a pre-rebake frame lands in the sample window is a
 * race, so that race became the reported number.
 *
 * Diagnosed by hand this session before picking a fix: `DUMP_DRAWS=1 node
 * tools/shots.mjs comfort` dumps the raw per-frame [t, drawCalls] trace, and
 * two clean re-runs here both show the entrance's early frames sitting on a
 * SUSTAINED plateau (76, ~1.7 s, ~190 consecutive frames both times) before
 * the ease-in curve visibly starts moving the camera — not one outlier frame,
 * which rules out "a single racy frame" as the whole story.
 *
 * ⚑ THE CHOICE: a high percentile, not a fixed-time warm-up discard. A
 * time-based cutoff has to be re-tuned per leg — the entrance runs ~16 s of
 * recording, a scripted send only ~4 s — or a cutoff sized for the entrance
 * eats an entire short leg outright. A percentile scales with however many
 * frames a leg actually produced, and this file already trusts the same
 * shape of fix for the identical class of problem: `differentiate()`'s own
 * `smooth()` prefers a WINDOWED value to a raw instantaneous one for exactly
 * the reason stated there — "a single long frame... reads as a spike no eye
 * ever saw." `robustDrawPeak()` below discards the top `DRAW_PEAK_TRIM`
 * fraction of sampled frames (minimum 1, and only once there are enough
 * samples for a fraction to mean anything) before taking the max of what
 * remains — enough to absorb a handful of racy frames, not enough to erase a
 * genuinely SUSTAINED peak.
 *
 * ⚑ HONEST RESULT, not oversold: this could not be validated against an
 * actual 68-vs-76 split on this machine — this environment reproduced 76
 * every time, pre- and post-fix, across three separate full runs (see 08
 * §26's update for the numbers). What this fix guarantees is that a SHORT
 * race (a handful of frames, the mechanism §26 names) can no longer move the
 * reported number. If the flakiness persists on another machine despite
 * this, the plateau's LEVEL itself is racy, not just its edges — a deeper
 * problem this fix does not address, and whoever next reproduces the 68 side
 * should say so rather than re-widening the trim to chase it.
 */
const DRAW_PEAK_TRIM = 0.02;
function robustDrawPeak(samples) {
  if (!samples.length) return 0;
  const sorted = [...samples].sort((a, b) => b - a);
  const drop = sorted.length >= 50 ? Math.max(1, Math.round(sorted.length * DRAW_PEAK_TRIM)) : 0;
  return sorted[drop] ?? sorted[sorted.length - 1];
}

/**
 * 1 · THE COMFORT ENVELOPE, and 2 · the draw-call peak, from one recording.
 * Every driven leg: the entrance descent, all three choreography transitions
 * (three legs each), and the scripted-send dolly.
 */
async function comfort(browser, asserts) {
  const legs = [];
  const drawPeaks = [];

  // ── the entrance descent, entered THE ORDINARY WAY ──
  // ⚑ No review param. `?reinterp=1&debug=1` lands on the pre-fiction panel and
  // the app does not exist yet; logging in IS the entry gesture (the opening
  // decision doc §3), and the descent is armed by that click. Reaching it any
  // other way would measure a leg the player never flies.
  {
    const page = await browser.newPage();
    page.on('console', (m) => { const t = m.text(); if (/ASSERT|Invalid batch/i.test(t)) asserts.push(t.slice(0, 160)); });
    await page.goto(`http://localhost:${PORT}/?reinterp=1&debug=1&home=0`, { waitUntil: 'networkidle2', timeout: 60000 });
    // ⚑ The ethics arm-delay (orientingCard.ts, ARM_DELAY_MS): "enter" can
    // never be instant, so the button is disabled for the first seconds. Wait
    // for it rather than shortening it — the delay is a law, not a loading bar.
    await page.waitForFunction(() => {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in'));
      return !!b && !b.disabled;
    }, { timeout: 30000 });
    const loggedIn = await clickPanel(page, 'Log in');
    if (!loggedIn) { console.log('   ⚠ no "Log in" on the opening panel — the descent was NOT measured'); }
    await page.waitForFunction(() => window.__camPose !== undefined, { timeout: 40000 });
    await page.evaluate(RECORDER);
    // the descent is armed the moment the room exists; 10 s + slack
    await wait(16000);
    const rec = await page.evaluate(() => { window.__recOn = false; return window.__rec; });
    for (const L of differentiate(rec)) legs.push({ ...L, name: 'entrance descent' });
    drawPeaks.push({ what: 'entrance', peak: robustDrawPeak(rec.map((r) => r[8])) });
    await page.close();
  }

  // ── the three relocations, flown through the panel's own replay handler ──
  for (const [label, name, seconds] of [
    ['1 · E1→E2', 'E1→E2', 26],
    ['2 · E2→E3', 'E2→E3', 36],
    ['3 · E3→E4', 'E3→E4', 50]
  ]) {
    const page = await openPage(browser, '?reinterp=1&era=2&debug=1&descent=0', asserts);
    await page.evaluate(RECORDER);
    const found = await clickPanel(page, label);
    if (!found) { console.log(`   ⚠ panel button "${label}" not found — leg NOT measured`); await page.close(); continue; }
    await wait(seconds * 1000);
    const rec = await page.evaluate(() => { window.__recOn = false; return window.__rec; });
    const found3 = differentiate(rec);
    const legNames = ['rise', 'build', 'descend'];
    found3.forEach((L, i) => legs.push({ ...L, name: `${name} · ${legNames[i] ?? 'leg ' + (i + 1)}` }));
    drawPeaks.push({ what: name, peak: robustDrawPeak(rec.map((r) => r[8])) });
    await page.close();
  }

  // ── the scripted sends: the REAL callback the OS fires on a resolved
  //    summons (app.ts's os.onSendResolve → dollyTo), not a simulation of it ──
  {
    const page = await openPage(browser, '?reinterp=1&era=3&debug=1&descent=0', asserts);
    let peak = 0;
    for (const id of ['s1', 's2', 's3', 's4']) {
      await page.evaluate(RECORDER);
      await page.evaluate((s) => window.__os?.onSendResolve?.(s, 'visited'), id);
      // ⚑ 2026-08-17: was 4000 — sized for the 2.4 s dolly this seam used to
      // fly. Sérgio's D-B decision took it to 38 s (CAMERA_POSES.dollySeconds),
      // and a 4 s window then sampled the first 1% of the move: the chord
      // collapsed 8.87 m → 0.09 m and every velocity came back comfortably
      // inside the envelope, which read exactly like a PASS. It was not a pass;
      // it was the tool no longer watching. ⚑ A sampling window shorter than the
      // move it measures does not report a small number — it reports a WRONG
      // one, and this one would have cleared the very legs it exists to guard.
      // 42 s = the 39 s dolly plus slack. If the dolly changes again, so does this.
      await wait(42000);
      const rec = await page.evaluate(() => { window.__recOn = false; return window.__rec; });
      peak = Math.max(peak, robustDrawPeak(rec.map((r) => r[8])));
      // a send that resolves to the seat you are already in is a no-op, not a
      // leg (dollyTo returns early) — those simply produce nothing to measure
      for (const L of differentiate(rec)) legs.push({ ...L, name: `scripted send ${id} · dolly` });
    }
    drawPeaks.push({ what: 'sends', peak });
    await page.close();
  }

  return { legs, drawPeaks };
}

/** 5 · CONSOLE ASSERTS — S71 drove the eight `terminalFrame` ones to zero */
async function assertSweep(browser, asserts) {
  const page = await openPage(browser, '?reinterp=1&era=2&debug=1&descent=0', asserts);
  for (const label of ['E3 2016', 'E4 now', 'E2 2003', 'E1 1997']) {
    await clickPanel(page, label);
    await wait(3500);
  }
  await page.close();
}

/** 4 · SUBJECT-IN-FRAME — offline, from the published poses + measured boxes */
function subjectsInFrame(poses) {
  withDerivedSeats(poses); // also for `framing` re-scoring a sweep saved before S107
  const aspect = VIEWPORT.width / VIEWPORT.height;
  const rows = [];
  for (const [era, state] of Object.entries(ERA_STATE)) {
    const boxes = JSON.parse(execFileSync(process.execPath,
      [path.join(ROOT, 'tools/room-audit.mjs'), '--state', state, '--boxes'],
      { cwd: ROOT, maxBuffer: 1 << 26 }).toString());
    for (const seat of ERA_SEATS[era]) {
      for (const s of SEAT_SUBJECTS[seat] ?? []) {
        let at = s.at;
        if (s.kind === 'prop') {
          const b = boxes[s.id];
          if (!b) { rows.push({ era, seat, what: s.what, missing: s.id, required: s.required !== false }); continue; }
          at = [0, 1, 2].map((k) => (b.min[k] + b.max[k]) / 2);
        }
        const f = framing(poses.seats[seat], at, poses.fov, aspect);
        rows.push({ era, seat, what: s.what, required: s.required !== false, at, ...f });
      }
    }
  }
  return rows;
}

// ═══ VERIFY — cross-check the maths against the live engine ════════════════
/**
 * ⚑ room-audit.mjs was checked against the engine to 0.00000 m before any of its
 * numbers were believed, and that is why its findings held. Same discipline: the
 * projection above is checked against PlayCanvas' own worldToScreen, and the
 * comfort model (1.875 × chord / dur for a smootherstep arc, 1.5 × for a
 * smoothstep tween) against a live recording.
 */
async function verify(browser, asserts) {
  const page = await openPage(browser, '?reinterp=1&era=4&debug=1&descent=0', asserts);
  const poses = await page.evaluate(() => window.__poses());
  const aspect = VIEWPORT.width / VIEWPORT.height;
  const probes = [];
  for (const [seat, subs] of Object.entries(SEAT_SUBJECTS)) {
    for (const s of subs) {
      if (s.kind !== 'plane') continue;
      probes.push({ seat, at: s.at, what: s.what });
    }
  }
  // a lattice too, so agreement is not an accident of four hand-picked points
  for (const seat of ['r1', 'r2', 'r3']) {
    for (const x of [-1, 0, 1]) for (const y of [0.4, 1.2, 2.0]) for (const z of [-1, 0.2, 1.5]) {
      probes.push({ seat, at: [x, y, z], what: 'lattice' });
    }
  }
  /**
   * The engine's own answer, taken from the LIVE camera entity: pose the real
   * rig exactly as the seat table says, let PlayCanvas compose the hierarchy,
   * then invert the camera's world matrix. That inverse IS world→view, which is
   * precisely what `toCameraSpace` models — so any disagreement is this file's
   * bug, in metres, and the tool says so rather than trusting itself.
   */
  const agree = await page.evaluate((args) => {
    const app = window.__app;
    const cam = app.root.findByName('camera');
    const rig = cam.parent;
    const out = [];
    for (const p of args.probes) {
      const pose = args.poses.seats[p.seat];
      rig.setLocalPosition(pose.x, pose.y, pose.z);
      rig.setLocalEulerAngles(pose.pitch, pose.yaw, 0);
      rig.syncHierarchy();
      const inv = cam.getWorldTransform().clone().invert();
      const v = { x: p.at[0], y: p.at[1], z: p.at[2] };
      const r = { x: 0, y: 0, z: 0 };
      inv.transformPoint(v, r);
      out.push([r.x, r.y, r.z]);
    }
    return out;
  }, { probes, poses });

  let worst = 0, worstAt = null;
  probes.forEach((p, i) => {
    const mine = toCameraSpace(poses.seats[p.seat], p.at);
    const theirs = agree[i];
    const d = Math.max(Math.abs(mine.x - theirs[0]), Math.abs(mine.y - theirs[1]), Math.abs(mine.z - theirs[2]));
    if (d > worst) { worst = d; worstAt = p; }
  });

  /**
   * …and L2's own cross-check, folded in from `tools/harness/verify-aabb.mjs`
   * (S71's, which is how room-audit earned its 0.00000 m). It belongs here for
   * the same reason everything else does: left as a loose script with a
   * hardcoded Chrome path it would be run once and never again. Every prop's
   * live PlayCanvas world AABB against the offline tool's, at this era's state.
   */
  const live = await page.evaluate(() => {
    const app = window.__app;
    const roomEnt = app?.root?.findByName('era1-room');
    if (!roomEnt) return { error: 'no era1-room' };
    const out = {};
    for (const child of roomEnt.children) {
      if (!child.enabled) continue;
      let min = null, max = null;
      child.forEach((n) => {
        if (!n.render) return;
        for (const mi of n.render.meshInstances) {
          const c = mi.aabb.center, h = mi.aabb.halfExtents;
          const lo = [c.x - h.x, c.y - h.y, c.z - h.z], hi = [c.x + h.x, c.y + h.y, c.z + h.z];
          if (!min) { min = lo.slice(); max = hi.slice(); }
          else for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], lo[k]); max[k] = Math.max(max[k], hi[k]); }
        }
      });
      if (min) out[child.name] = { min, max };
    }
    return out;
  });
  let aabb = { error: live.error ?? null, checked: 0, worst: 0, missing: 0, worstId: null };
  if (!live.error) {
    const boxes = JSON.parse(execFileSync(process.execPath,
      [path.join(ROOT, 'tools/room-audit.mjs'), '--state', 'r4', '--boxes'],
      { cwd: ROOT, maxBuffer: 1 << 26 }).toString());
    for (const [id, b] of Object.entries(boxes)) {
      const l = live[id];
      if (!l) { aabb.missing++; continue; }
      aabb.checked++;
      const d = Math.max(...[0, 1, 2].map((k) =>
        Math.max(Math.abs(l.min[k] - b.min[k]), Math.abs(l.max[k] - b.max[k]))));
      if (d > aabb.worst) { aabb.worst = d; aabb.worstId = id; }
    }
  }

  await page.close();
  return { probes: probes.length, worst, worstAt, aspect, fov: poses.fov, aabb };
}

// ═══ REPORT ════════════════════════════════════════════════════════════════

const failures = [];
const notes = [];
const skipped = [];
const fmt = (n, d = 3) => Number(n).toFixed(d);

function reportComfort(legs) {
  if (!legs.length) { skipped.push('COMFORT — no leg was recorded'); return; }
  console.log('\n━━ 1 · THE COMFORT ENVELOPE ' + `(${COMFORT_MPS} m/s · ${COMFORT_DPS} °/s, desktop-measured; A11 has never run) ━━`);
  console.log('   chord is PATH length; both figures are differentiated against the move\'s own clock,');
  console.log('   so they are the velocities the curve prescribes rather than the renderer\'s frame pacing.');
  console.log('   leg                              chord    s     peak m/s  sust m/s   peak °/s  sust °/s');
  for (const L of legs.sort((a, b) => b.sustainedMps / COMFORT_MPS - a.sustainedMps / COMFORT_MPS)) {
    const bad = L.sustainedMps > COMFORT_MPS || L.sustainedDps > COMFORT_DPS;
    console.log(`   ${bad ? '⚑' : ' '} ${L.name.padEnd(30)} ${fmt(L.chord, 2).padStart(6)} ${fmt(L.seconds, 1).padStart(5)} ` +
      `${fmt(L.peakMps).padStart(9)} ${fmt(L.sustainedMps).padStart(9)} ${fmt(L.peakDps, 2).padStart(10)} ${fmt(L.sustainedDps, 2).padStart(9)}`);
    if (bad) {
      // the exact remedy, in the repo's own idiom: peak scales as 1/duration,
      // so the duration that lands inside BOTH ceilings is the worse ratio
      const need = L.seconds * Math.max(L.sustainedMps / COMFORT_MPS, L.sustainedDps / COMFORT_DPS);
      failures.push(`COMFORT: "${L.name}" runs at ${fmt(L.sustainedMps)} m/s / ${fmt(L.sustainedDps, 2)} °/s ` +
        `over ${fmt(L.chord, 2)} m in ${fmt(L.seconds, 1)} s — ` +
        `${fmt(Math.max(L.sustainedMps / COMFORT_MPS, L.sustainedDps / COMFORT_DPS), 1)}× the ` +
        `${COMFORT_MPS} m/s / ${COMFORT_DPS} °/s envelope, which is CLAUDE.md's one bodily law. ` +
        `⚑ PROPOSAL, not applied: the same leg at ${fmt(need, 1)} s is inside it. ` +
        `Nothing in this tool may retune a composition on its own.`);
    }
  }
  if (legs.some((L) => /scripted send/.test(L.name) && L.sustainedMps > COMFORT_MPS)) {
    console.log('\n   ⚑ ON THE SEND LEGS, because it changes the urgency without excusing them:');
    console.log('   HISTORICAL WRONG CLAIM: no beat fires this seam, so every leg is latent.');
    console.log('   S82 static trace: s2 is ordinary-path reachable in E2; s3/s4 remain inaccessible');
    console.log('   on Daniel\'s black E3 CRT. Their audit exclusions are retained by instruction. The');
    console.log('   dolly is seat→seat through one 2.4 s arc, and Room 2 → Room 3 is 8.8 m of it.');
  }
}

function reportDraw(peaks) {
  if (!peaks.length) { skipped.push('DRAW CALLS — nothing recorded'); return; }
  // ⚑ S82: this historical exclusion groups all send measurements, but s2 is
  // ordinary-path reachable in E2; s3/s4 remain inaccessible on the E3 CRT.
  // Retained by explicit audit instruction; whoever owns sends must re-scope it.
  const reachable = peaks.filter((p) => !DRAW_CALL_LATENT.test(p.what));
  const peak = Math.max(...(reachable.length ? reachable : peaks).map((p) => p.peak));
  console.log(`\n━━ 2 · DRAW-CALL CEILING (Quest budget ≤${DRAW_CALL_BUDGET}; ratchet at ${DRAW_CALL_BASELINE}) ━━`);
  for (const p of peaks) console.log(`   ${String(p.peak).padStart(4)}  ${p.what}${p.peak > DRAW_CALL_BUDGET ? '  ⚑ over budget' : ''}`);
  if (peak > DRAW_CALL_BASELINE) {
    failures.push(`DRAW CALLS: peak ${peak} across the transitions, ratchet is ${DRAW_CALL_BASELINE}. ` +
      `The known cause is beginMorphedStateBatch() clearing the settled batch for the whole cascade (S71 P5).`);
  } else if (peak < DRAW_CALL_BASELINE) {
    notes.push(`draw calls improved: ${peak} < baseline ${DRAW_CALL_BASELINE} — tighten DRAW_CALL_BASELINE in tools/shots.mjs`);
  }
}

function reportBlank(frames, tune) {
  const scored = [];
  for (const f of frames) {
    let png;
    try { png = decodePng(fs.readFileSync(f.file)); }
    catch (e) { skipped.push(`BLANK — ${path.basename(f.file)}: ${e.message}`); continue; }
    scored.push({ ...f, ...frameFlatness(png) });
  }
  if (!scored.length) { skipped.push('BLANK FRAMES — no frame could be read'); return; }
  const flagged = scored.filter((s) => s.fraction >= FRAME_FLAT_FRACTION);
  console.log(`\n━━ 3 · BLANK-FRAME CHECK (${scored.length} frames · flat tile < ${TILE_FLAT_STD} σ · frame flagged at ≥${FRAME_FLAT_FRACTION * 100}% flat) ━━`);
  if (tune) {
    console.log('   ⚑ --tune: the whole distribution, worst first. Set the constants from THIS, not from a guess.');
    for (const s of [...scored].sort((a, b) => b.fraction - a.fraction)) {
      console.log(`   ${fmt(s.fraction, 2).padStart(5)} flat  meanσ ${fmt(s.meanStd, 2).padStart(6)}  minσ ${fmt(s.minStd, 2).padStart(6)}  luma ${fmt(s.meanLuma, 1).padStart(6)}  ${s.name} (e${s.era})`);
    }
  } else {
    const worst = [...scored].sort((a, b) => b.fraction - a.fraction).slice(0, 5);
    console.log('   worst five (—tune prints all):');
    for (const s of worst) console.log(`   ${fmt(s.fraction, 2).padStart(5)} flat  meanσ ${fmt(s.meanStd, 2).padStart(6)}  luma ${fmt(s.meanLuma, 1).padStart(6)}  ${s.name} (e${s.era})`);
  }
  for (const s of flagged) console.log(`   ⚑ FLAT: ${s.name} (e${s.era}) — ${(s.fraction * 100).toFixed(0)}% of tiles carry no structure`);
  if (flagged.length > BLANK_BASELINE) {
    failures.push(`BLANK FRAMES: ${flagged.length} frames read as flat, ratchet is ${BLANK_BASELINE}. ` +
      `A frame with no luminance structure is an unlit block or a dead screen: ` +
      flagged.map((s) => `${s.name}@e${s.era}`).join(', '));
  } else if (flagged.length < BLANK_BASELINE) {
    notes.push(`blank frames improved: ${flagged.length} < baseline ${BLANK_BASELINE} — tighten BLANK_BASELINE in tools/shots.mjs`);
  }
  return scored;
}

function reportFraming(rows) {
  console.log(`\n━━ 4 · SUBJECT-IN-FRAME (vertical FOV ${rows[0]?.halfV ? fmt(rows[0].halfV * 2, 0) : '42'}°, half ${rows[0]?.halfV ? fmt(rows[0].halfV, 1) : '21'}° · horizontal half ${rows[0]?.halfH ? fmt(rows[0].halfH, 1) : '?'}°) ━━`);
  const off = [];
  for (const r of rows) {
    if (r.missing) {
      console.log(`   ⚑ MISSING  e${r.era} ${r.seat.padEnd(10)} ${r.what} — no prop "${r.missing}" in this state`);
      if (r.required) off.push(r);
      continue;
    }
    const mark = r.inFrame ? ' ' : '⚑';
    console.log(`   ${mark} e${r.era} ${r.seat.padEnd(10)} ${r.what.padEnd(28)} ` +
      `${r.vert >= 0 ? '+' : ''}${fmt(r.vert, 1)}° vert · ${r.horiz >= 0 ? '+' : ''}${fmt(r.horiz, 1)}° horiz · ${fmt(r.depth, 2)} m` +
      (r.inFrame ? '' : `  OUT OF FRAME${r.required ? '' : ' (expected — S71 P3)'}`));
    if (!r.inFrame) off.push(r);
  }
  const hard = off.filter((r) => r.required);
  if (hard.length) {
    failures.push(`SUBJECT-IN-FRAME: ${hard.length} REQUIRED subject(s) outside the frustum: ` +
      hard.map((r) => `${r.what} at seat ${r.seat} (e${r.era})`).join('; '));
  }
  if (off.length > OFF_FRAME_BASELINE) {
    failures.push(`SUBJECT-IN-FRAME: ${off.length} declared subjects out of frame, ratchet is ${OFF_FRAME_BASELINE}.`);
  } else if (off.length < OFF_FRAME_BASELINE) {
    notes.push(`framing improved: ${off.length} < baseline ${OFF_FRAME_BASELINE} — tighten OFF_FRAME_BASELINE in tools/shots.mjs`);
  }
  if (off.some((r) => !r.required)) {
    console.log('   PROPOSAL (S71 P3, unresolved, nothing applied): the desks sit below the frame at every seat.');
    console.log('   One-line versions if it should change: seat pitch −8 (costs the top of the monitor), or eye y 1.16 → 1.24.');
  }
}

function reportAsserts(asserts) {
  const uniq = [...new Set(asserts)];
  console.log(`\n━━ 5 · CONSOLE ASSERTS (baseline ${ASSERT_BASELINE} — S71 closed the eight terminalFrame ones) ━━`);
  if (!uniq.length) console.log('   none.');
  for (const a of uniq.slice(0, 10)) console.log(`   ⚑ ${a}`);
  if (uniq.length > ASSERT_BASELINE) {
    failures.push(`CONSOLE ASSERTS: ${uniq.length} distinct assert/pageerror line(s) across the run, baseline ${ASSERT_BASELINE}. ` +
      `S71's cause was a batched node's .enabled being flipped (cluster.ts setTerminalVisible); check the same class first.`);
  }
}

// ═══ MAIN ══════════════════════════════════════════════════════════════════

/** frames a previous sweep wrote, with their paths made absolute again */
const loadFrames = (dir) =>
  JSON.parse(fs.readFileSync(path.join(path.resolve(ROOT, dir), '_frames.json'), 'utf8'))
    .map((f) => ({ ...f, file: path.resolve(ROOT, f.file) }));

// ⚑ `blank` is OFFLINE — the whole reason the PNG reader above is hand-written
// rather than a dependency. Re-scoring last week's sweep must not need a
// browser or a server, so it runs before either is asked for.
// `framing` is offline too: a sweep saves the published pose tables next to its
// frames, and the prop boxes come from room-audit, which needs nothing either.
if (MODE === 'blank' || MODE === 'framing') {
  const dir = path.resolve(ROOT, POSITIONAL[0] ?? OUT);
  if (MODE === 'blank') reportBlank(loadFrames(dir), has('tune'));
  else reportFraming(subjectsInFrame(JSON.parse(fs.readFileSync(path.join(dir, '_poses.json'), 'utf8'))));
  for (const n of notes) console.log(`  note:    ${n}`);
  if (failures.length) { for (const f of failures) console.log(`\n  ⚑ FAIL:  ${f}`); process.exit(1); }
  process.exit(0);
}

const chrome = resolveChrome();
if (!chrome) skip('no Chrome/Chromium found on this machine');

const stopServer = await ensureServer(PORT);
teardown = stopServer;
let browser = null;
let exitCode = 0;
try {
  browser = await launch(chrome);
  const asserts = [];
  console.log(`· chrome: ${chrome}`);
  console.log(`· viewport: ${VIEWPORT.width}×${VIEWPORT.height}`);

  if (MODE === 'sweep') {
    const { frames } = await sweep(browser, asserts, OUT);
    console.log(`\n${frames.length} frames → ${path.relative(ROOT, OUT)}`);
  } else if (MODE === 'devices') {
    const out = await devices(browser, asserts, OUT);
    console.log(`\n${out.length} device canvases → ${path.relative(ROOT, OUT)}`);
  } else if (MODE === 'sheet') {
    const dir = path.resolve(ROOT, POSITIONAL[0] ?? OUT);
    const file = await sheet(browser, loadFrames(dir), path.join(dir, '_contact_sheet.png'), Number(flag('scale', 0.5)));
    console.log(`\ncontact sheet → ${path.relative(ROOT, file)}`);
  } else if (MODE === 'comfort') {
    const { legs, drawPeaks } = await comfort(browser, asserts);
    reportComfort(legs);
    reportDraw(drawPeaks);
  } else if (MODE === 'zoom') {
    const rows = await zoomLegibility(browser, asserts, OUT);
    console.log('\n━━ ⚑ MODE 3 · IS THE 512×384 CANVAS LEGIBLE ON A PHONE? ━━');
    console.log('   one canvas pixel, measured on screen, at each end of the pinch zoom:');
    for (const r of rows) {
      console.log(`   ${r.orient.padEnd(9)} ${String(r.w).padStart(4)}×${String(r.h)} · FOV ${String(r.fov).padStart(2)}° · ` +
        `monitor ${r.monitorPx.toFixed(0)} px tall · ${r.pxPerRow.toFixed(3)} screen px per canvas row`);
    }
    console.log(`\n   ${rows.length} frames → ${path.relative(ROOT, OUT)} — ⚑ LOOK AT THEM. This tool measures;`);
    console.log('   whether the text can be READ is a judgement, and it is Sérgio\'s.');
  } else if (MODE === 'verify') {
    const v = await verify(browser, asserts);
    console.log(`\n━━ CROSS-CHECK vs the live engine ━━`);
    console.log(`   ${v.probes} probe points · worst camera-space disagreement ${v.worst.toExponential(2)} m`);
    console.log(`   fov ${v.fov}° vertical · aspect ${fmt(v.aspect, 3)} · horizontal half ${fmt(Math.atan(Math.tan(v.fov / 2 * Math.PI / 180) * v.aspect) * 180 / Math.PI, 2)}°`);
    if (v.worst > 1e-4) {
      console.log(`   ⚑ DISAGREEMENT at ${JSON.stringify(v.worstAt)} — the assertion is wrong until proven otherwise.`);
      exitCode = 1;
    } else console.log('   agrees. The projection above models the engine.');
    if (v.aabb.error) console.log(`   room-audit AABB check: SKIPPED (${v.aabb.error})`);
    else {
      console.log(`   room-audit vs live AABBs at r4: ${v.aabb.checked} props · worst corner error ` +
        `${v.aabb.worst.toFixed(5)} m${v.aabb.worstId ? ` (${v.aabb.worstId})` : ''} · ` +
        `${v.aabb.missing} in data but not live/enabled`);
      if (v.aabb.worst > 0.005) {
        console.log('   ⚑ tools/room-audit.mjs disagrees with the engine — its placement maths is stale.');
        exitCode = 1;
      }
    }
  } else if (MODE === 'audit') {
    console.log('\n╔══ L3 · CAPTURE ═══════════════════════════════════════════════╗');
    const { frames, poses, perf } = await sweep(browser, asserts, OUT);
    const dev = await devices(browser, asserts, OUT);
    writeManifest(OUT, [...frames, ...dev]); // so `blank`/`sheet` see both later
    console.log(`   ${frames.length} room frames + ${dev.length} device canvases → ${path.relative(ROOT, OUT)}`);
    console.log(`   settled draw calls: ${perf.map((p) => `e${p.era} ${p.drawCalls}`).join(' · ')}`);
    console.log('\n╔══ L4 · ASSERTIONS ════════════════════════════════════════════╗');
    const { legs, drawPeaks } = await comfort(browser, asserts);
    await assertSweep(browser, asserts);
    reportComfort(legs);
    reportDraw(drawPeaks);
    reportBlank([...frames, ...dev], has('tune'));
    reportFraming(subjectsInFrame(poses));
    reportAsserts(asserts);
    console.log('\n━━ 6 · REACHABILITY ON THE ORDINARY PATH ━━');
    console.log('   ⚑ NOT BUILT (S72). C6 proves every beat has a debug button; nothing here');
    console.log('   proves a beat is reachable WITHOUT one — the S64 class, where `?era=` killed');
    console.log('   the spine and misled three playthroughs. It needs a real forward traversal');
    console.log('   (click-only, no review params, E1 → the Close) and that is its own session.');
    skipped.push('REACHABILITY (assertion 6) — not built; see the note above');
  } else {
    console.log(`unknown mode "${MODE}". Modes: audit · sweep · devices · sheet · blank · framing · comfort · verify · zoom`);
    exitCode = 2;
  }

  if (MODE === 'audit') {
    console.log('\n╔══ REPORT ═════════════════════════════════════════════════════╗');
    for (const n of notes) console.log(`  note:    ${n}`);
    for (const s of skipped) console.log(`  skipped: ${s}`);
    if (failures.length) {
      console.log('');
      for (const f of failures) console.log(`  ⚑ FAIL:  ${f}`);
      exitCode = 1;
    } else {
      console.log(`\n  audit OK — 5 assertions live, 1 not built.`);
    }
    if (AS_JSON) fs.writeFileSync(path.join(OUT, '_report.json'), JSON.stringify({ failures, notes, skipped }, null, 1));
  }
} finally {
  if (browser) await browser.close();
  stopServer();
}
process.exit(exitCode);
