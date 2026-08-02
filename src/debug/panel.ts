/**
 * Debug panel (dev only, ?debug=1) — travel the reinterp build without playing
 * it through. Round 24: rebuilt for LEGIBILITY (Sérgio couldn't tell which
 * version/room he was in — he was on a stale server). It now shows a BUILD TAG,
 * a live "you are here" readout (era + room), clearly-labelled era + room jumps,
 * and a links list of every review URL + the controls. Toggle with backtick (`)
 * or the hide/⚙ buttons.
 */
import * as pc from 'playcanvas';
import { DesktopOS } from '../desktop/os';

/** bump this each build so the panel says which version is on screen */
const BUILD_TAG = 'R28-2d-iv · NetVision Player (New You infomercial)';

interface DebugOpts {
  /** The live renderer: required for a non-black WebGL canvas readback. */
  app?: pc.Application;
  onEra?: (era: 'e1' | 'e2' | 'e3' | 'e4') => void;
  onReveal?: () => void;
  onClose?: () => void;
  onFacet?: (facet: 'transfem' | 'transmasc' | 'nonbinary' | 'all' | 'none') => void;
  onFlip?: () => void;
  /** dev-only camera jump: seat pose at an exact yaw (review screenshots) */
  onCamProbe?: (yaw: number, pitch: number) => void;
  /** the send seam (master script §4) — review buttons until beats fire it */
  sends?: { id: string; label: string }[];
  onSend?: (id: string, outcome: 'offered' | 'visited' | 'declined') => void;
}

/**
 * Every debugJump id `src/desktop/os.ts` accepts, one labelled button each,
 * grouped and ordered as the piece's own spine (S50, per
 * docs/REINTERP_PLAYTHROUGH_NOTES_2026-07-25.md "ROOT CAUSE FOUND"): the panel
 * IS the project lead's map, so a gap here reads as missing content when it
 * isn't. Ids are enumerated from os.ts's debugJump switch directly, not from
 * any notes doc — the notes doc's own count (~51, and a `tape` id) was wrong;
 * `tape` is a profile-ICON case in a different switch (drawProfileIcon), not a
 * debugJump id, so there is nothing to add a button for.
 *
 * check-spec **C6** (tools/check-spec.mjs) parses this file textually for
 * every `id: '...'` below plus OS_BEAT_EXCLUSIONS, and fails the build if
 * os.ts's debugJump accepts an id that appears in neither — so this list
 * cannot silently drift behind the build again. Keep entries as `{ id: '...' }`
 * object literals (not tuples) so that parse stays simple.
 */
type BeatRow = { heading: string } | { label: string; id: string };

const OS_BEATS: BeatRow[] = [
  { heading: 'E1 · 1997 — boot → arrival (Room 1, gay teen)' },
  { label: 'Off (power)', id: 'off' },
  { label: 'O2 — LambyOS boot', id: 'boot' },
  { label: 'O3 — Profile', id: 'profile' },
  { label: 'O3 — Re-caption', id: 'recap' },
  { label: 'Desktop', id: 'desktop' },
  { label: 'Insert kit → O7', id: 'kit' },
  { label: 'Packet · placement form', id: 'packet' },
  { label: 'Diary · deletion beat', id: 'diary' },
  { label: 'Diary glitch → T1', id: 'diaryGlitch' },
  { label: 'Provotype — pillow', id: 'pillow' },
  { label: 'Provotype — intake', id: 'intake' },
  { label: 'lamby_rig.exe — the E1 easter egg (found, not advertised)', id: 'lambyRig' },
  // Session 60: the Dossier card, rebuilt as the second found file — same
  // rules as lamby_rig.exe. In play it appears on an IDLE desktop after the
  // first flip and is never announced; this button opens it directly.
  { label: 'the found file — the renamed dossier (easter egg)', id: 'foundFile' },
  { label: 'T1 ritual · update → E2', id: 'update2' },

  { heading: 'E2 · 2003 — Lamby arrives (Room 1, adult)' },
  // Session 49 (finding 6): every button below jumps INTO the middle of E2.
  // Sérgio reported the video and the check-in as "missing" after landing
  // inside the Caleb thread, where neither is on screen — both are built and
  // both are reachable, but only by PLAYING forward. `e2Silence` is the era's
  // true start, so it is the one button from which the whole chain runs by
  // ordinary clicking: silence → click → Lamby's debut → Begin → Restorify →
  // ONE check-in → Caleb opens by itself → commit-press → the alert → Okay →
  // the video offer → Watch → the New You Program. Verified end-to-end with
  // real clicks in Session 49; the label says so, so a reviewer never has to
  // infer it from the button order.
  { label: 'S2R.0 · silence — ⏵ LINEAR ENTRY (play from here)', id: 'e2Silence' },
  // Session 60: the arrival is four beats now, not two — the machine boots at
  // its new version (with its jingle), Lamby introduces HIMSELF, then presents
  // the program he is the face of, then the check-in. Each has its own button
  // so a reviewer can land on the one they mean; `e2Silence` above still plays
  // the whole chain forward by ordinary clicking.
  { label: 'S2R.0b · LambyOS 2003 boot (+ jingle hook)', id: 'e2Boot' },
  { label: 'S2R.1 · ⚑ Lamby introduces himself', id: 'e2Lamby' },
  { label: 'S2R.1b · Lamby presents Restorify', id: 'e2Program' },
  { label: 'S2R.2 · Restorify check-in', id: 'e2Restorify' },
  { label: 'S2R.2b · "a message came in" (Lamby notifies)', id: 'e2Message' },
  { label: 'S2R.3 · Caleb — chat opens', id: 'calebChat' },
  { label: 'S2R.3 · Caleb — commits', id: 'calebCommit' },
  { label: 'S2R.3B · Caleb — apparatus alert', id: 'calebAlert' },
  { label: 'S2R.3C · Caleb — sad Lamby hold', id: 'calebSad' },
  { label: 'S2R.3C · Caleb — caught', id: 'calebCaught' },
  { label: 'S2R.4 · Lamby offers the video', id: 'netvisionOffer' },
  { label: 'S2R.4 · NetVision Player (start)', id: 'netvision' },
  { label: 'S2R.4 · NetVision — THE BREAK', id: 'netvisionBreak' },
  { label: 'S2R.4 · NetVision — static/notice', id: 'netvisionStatic' },
  { label: 'S2R.5 · Caleb — PureMail envelope arrives', id: 'calebMail' },
  { label: 'S2R.6 · Caleb — the residue (quiet after)', id: 'calebResidue' },
  // S2R.7 (Session 58) — the era's ending. `update3` is the whole ritual from
  // its notice (Remind me later → the second belongings gathering → terms →
  // install → restart into Room 2); `u3Dispersal` lands straight on the
  // install screen where Lamby comes apart, since that beat is otherwise ~40s
  // of deferral deep. The residue that CAUSES all of this is `calebResidue`
  // above — play from there to see the era close on its own.
  { label: 'S2R.7 · T2 ritual · update → E3 (+ 2nd belongings pass)', id: 'update3' },
  { label: 'S2R.7 · THE DISPERSAL (u3 install: removed / RENAMED)', id: 'u3Dispersal' },

  { heading: 'E3 → E4 (Room 2 lesbian → Room 3 trans)' },
  { label: 'T3 ritual · update → E4', id: 'update4' },

  { heading: 'Close' },
  { label: 'Final · Restart as you are', id: 'closeUpdate' },

  { heading: 'Sends — desktop offer review' },
  { label: 'Offer send s1 (desktop)', id: 'send-s1' },
  { label: 'Offer send s2 (desktop)', id: 'send-s2' },
  { label: 'Offer send s3 (desktop)', id: 'send-s3' },
  { label: 'Offer send s4 (desktop)', id: 'send-s4' }
];

/**
 * ⚑ THE E3 DEVICE BEATS (Session 64) — the correction list, the break, the light.
 *
 * These are NOT `debugJump` ids: they live on Room 2's own screens
 * (`src/room/graceQueueLite.ts`), which `src/desktop/os.ts` knows nothing
 * about, so check-spec's C6 cannot see them. They get buttons anyway, and for
 * exactly C6's reason — three previous sessions shipped beats Sérgio could not
 * reach, and concluded content was missing when it wasn't. Deliberately typed
 * as `[label, beat]` tuples rather than `{ id: '…' }` objects so C6's textual
 * parse of this file stays clean and cannot mistake a device beat for an OS one.
 *
 * They reach the live instance through `window.__graceQueue()` — the same
 * `?debug=1` probe app.ts already publishes for review drives — so the panel
 * needs no new wiring through `src/engine/app.ts`.
 */
const E3_DEVICE_BEATS: Array<[string, string]> = [
  ['sign in → the correction list', 'list'],
  ['⚑ submission 1 · the seven corrections', 'list'],
  ['apply the open correction', 'apply'],
  ['skip it (files; nothing happens)', 'skip'],
  ['⚑ item 7 · route for mentorship (the hinge)', 'item7'],
  ['⚑ submission 2 · Noa (both corrections)', 'noa'],
  ['the phone · Malta arrives (notification)', 'maltaArrive'],
  ['the phone · open the message', 'maltaOpen'],
  ['the phone · press the reply field', 'reply'],
  ['⚑⚑ THE LIGHT — the brighten, alone', 'light'],
  ['…and back to the E3 rig (A/B)', 'lightOff']
];

/**
 * debugJump ids that intentionally have NO panel button — each entry needs a
 * one-line reason. C6 requires every id os.ts's debugJump accepts to be
 * either above (OS_BEATS) or here; currently empty because every id os.ts
 * accepts already has a button above.
 */
const OS_BEAT_EXCLUSIONS: string[] = [
  // (none — see the comment above OS_BEATS)
];

/** eras with the room + identity + year they now lead (Round 24 model) */
const ERAS: Array<['e1' | 'e2' | 'e3' | 'e4', string]> = [
  ['e1', 'E1 1997 · Room 1 (gay teen)'],
  ['e2', 'E2 2003 · Room 1 adult'],
  ['e3', 'E3 2016 · Room 2 (lesbian)'],
  ['e4', 'E4 now · Room 3 (trans)']
];

/** the three rooms (+ the spine) as seat yaws for the camera jump */
const ROOMS: Array<[string, number]> = [
  ['→ Room 1 · front (gay)', 0],
  ['→ Room 2 · west (lesbian)', 90],
  ['→ Room 3 · east (trans)', 270],
  ['→ spine · door + record', 180]
];

/** review URLs — the "all the options" links Sérgio asked for */
const LINKS: Array<[string, string]> = [
  ['E1 · opening + sealed room', '?reinterp=1&debug=1'],
  ['E2 · Room 1 adult (closed)', '?reinterp=1&era=2&debug=1'],
  ['E3 · rooms open, Vera leads', '?reinterp=1&era=3&debug=1'],
  ['E4 · Maya leads (the TURN)', '?reinterp=1&era=4&debug=1'],
  ['O7 · first-filing reveal', '?reinterp=1&reveal=1&debug=1'],
  ['T1 · watch E1→E2 morph', '?reinterp=1&morph=2&debug=1'],
  ['T2 · watch E2→E3 morph', '?reinterp=1&morph=3&debug=1'],
  ['T3 · watch E3→E4 morph', '?reinterp=1&morph=4&debug=1'],
  ['Close · point cloud', '?reinterp=1&close=1&debug=1'],
  ['Layout T · back = wall', '?reinterp=1&era=2&debug=1'],
  ['Layout X · back = ending arm', '?reinterp=1&era=2&debug=1&layout=x'],
  ['Flat 2D fallback', '?flat=1&reinterp=1']
];

export function mountDebugPanel(os: DesktopOS, opts: DebugOpts = {}): void {
  if (new URLSearchParams(window.location.search).get('debug') !== '1') return;
  if (opts.onCamProbe) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__camProbe = opts.onCamProbe;
  }

  const panel = document.createElement('div');
  Object.assign(panel.style, {
    position: 'fixed', top: '8px', left: '8px', zIndex: '9999',
    background: 'rgba(16,18,26,0.94)', color: '#cdd3df',
    font: '11px/1.4 monospace', padding: '8px', borderRadius: '6px',
    border: '1px solid #3a4154', maxHeight: '94vh', overflowY: 'auto',
    width: '188px', userSelect: 'none', boxShadow: '0 2px 12px #0008'
  } as CSSStyleDeclaration);

  const pill = document.createElement('button');
  pill.textContent = '⚙ map';
  Object.assign(pill.style, {
    position: 'fixed', top: '8px', left: '8px', zIndex: '9999', display: 'none',
    background: 'rgba(16,18,26,0.92)', color: '#8fb6ff', border: '1px solid #3a4154',
    font: '11px monospace', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer'
  } as CSSStyleDeclaration);
  const show = (on: boolean): void => {
    panel.style.display = on ? 'block' : 'none';
    pill.style.display = on ? 'none' : 'block';
  };
  pill.addEventListener('click', () => show(true));

  const title = document.createElement('div');
  Object.assign(title.style, {
    fontWeight: 'bold', marginBottom: '2px', color: '#8fb6ff',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  } as CSSStyleDeclaration);
  const titleText = document.createElement('span');
  titleText.textContent = 'PIECE MAP';
  const hideBtn = document.createElement('button');
  hideBtn.textContent = 'close ✕';
  Object.assign(hideBtn.style, {
    background: '#222838', color: '#cdd3df', border: '1px solid #39405270',
    font: '10px monospace', padding: '2px 6px', cursor: 'pointer', borderRadius: '3px'
  } as CSSStyleDeclaration);
  hideBtn.addEventListener('click', () => show(false));
  title.appendChild(titleText);
  title.appendChild(hideBtn);
  panel.appendChild(title);

  // BUILD TAG — which version is on screen (answers "which one am I looking at?")
  const build = document.createElement('div');
  build.textContent = 'build: ' + BUILD_TAG;
  build.style.cssText = 'color:#ffd48f;font-size:10px;margin-bottom:4px';
  panel.appendChild(build);

  // live "you are here": era + room, polled from the app (?debug=1)
  const now = document.createElement('div');
  now.style.cssText = 'color:#8fffc0;font-size:10px;margin:4px 0;min-height:13px;font-weight:bold';
  now.textContent = 'CURRENT: —';
  panel.appendChild(now);
  // draw calls vs the Quest budget (~50–100, WEBXR_PERFORMANCE_NOTES) + how
  // many props the static batcher folded away (?nobatch=1 to compare raw)
  const perf = document.createElement('div');
  perf.style.cssText = 'color:#9fb4c0;font-size:10px;margin-bottom:6px;min-height:13px';
  perf.textContent = 'draw calls: —';
  panel.appendChild(perf);
  window.setInterval(() => {
    const s = (window as { __reinterpNow?: string }).__reinterpNow;
    const place = s ?? '— (open a room)';
    now.textContent = 'CURRENT: ' + place;
    pill.textContent = '⚙ ' + (s?.split(' · ')[0] ?? 'map');
    const w = window as {
      __drawCalls?: number;
      __batchedProps?: number;
      __staticBatchedProps?: number;
      __settledBatchedProps?: number;
    };
    if (w.__drawCalls !== undefined) {
      const split = w.__batchedProps
        ? ` · batched props: ${w.__batchedProps} (${w.__staticBatchedProps ?? 0} static + ${w.__settledBatchedProps ?? 0} settled)`
        : ' · UNBATCHED';
      perf.textContent = `draw calls: ${w.__drawCalls}` +
        split;
    }
  }, 250);

  const mkBtn = (parent: HTMLElement, label: string, fn: () => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.textContent = label;
    Object.assign(b.style, {
      display: 'block', width: '100%', textAlign: 'left', margin: '2px 0',
      background: '#222838', color: '#cdd3df', border: '1px solid #39405270',
      font: '11px monospace', padding: '3px 6px', cursor: 'pointer', borderRadius: '3px'
    } as CSSStyleDeclaration);
    b.addEventListener('mouseenter', () => { b.style.background = '#313a52'; });
    b.addEventListener('mouseleave', () => { b.style.background = '#222838'; });
    b.addEventListener('click', () => fn());
    parent.appendChild(b);
    return b;
  };
  const heading = (parent: HTMLElement, text: string): void => {
    const h = document.createElement('div');
    h.textContent = text;
    h.style.cssText = 'color:#7f8aa3;font-size:9px;letter-spacing:0.06em;text-transform:uppercase;margin:8px 0 2px';
    parent.appendChild(h);
  };
  /** Keeps each map branch's open/closed state for the life of this panel. */
  const sectionState: Record<string, boolean> = {};
  const section = (label: string, summary: string, initiallyOpen = false): HTMLElement => {
    const wrap = document.createElement('section');
    wrap.style.cssText = 'border-top:1px solid #39405270;padding-top:4px;margin-top:5px';
    const toggle = document.createElement('button');
    Object.assign(toggle.style, {
      display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center',
      background: 'transparent', color: '#8fb6ff', border: '0', font: 'bold 10px monospace',
      padding: '2px 0', cursor: 'pointer', textAlign: 'left'
    } as CSSStyleDeclaration);
    const text = document.createElement('span');
    text.textContent = label;
    const marker = document.createElement('span');
    toggle.append(text, marker);
    const detail = document.createElement('div');
    detail.style.cssText = 'color:#7f8aa3;font-size:9px;margin:0 0 3px';
    detail.textContent = summary;
    const body = document.createElement('div');
    const setOpen = (open: boolean): void => {
      sectionState[label] = open;
      body.hidden = !open;
      detail.hidden = open;
      marker.textContent = open ? '−' : '+';
      toggle.setAttribute('aria-expanded', String(open));
    };
    setOpen(initiallyOpen);
    toggle.addEventListener('click', () => setOpen(!sectionState[label]));
    wrap.append(toggle, detail, body);
    panel.appendChild(wrap);
    return body;
  };

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:4px;margin:4px 0 2px';
  panel.appendChild(actions);
  const shotBtn = mkBtn(actions, '📷 shot', () => {
    const app = opts.app;
    if (!app) return;
    // WebGL clears its back buffer after presentation. Render and read the
    // PlayCanvas canvas in this same synchronous click path; preserveDrawingBuffer
    // would retain it at a performance cost on every 72 Hz frame.
    app.render();
    const cv = app.graphicsDevice.canvas;
    if (!cv) return;
    cv.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `uhf_reinterp_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  });
  shotBtn.style.cssText += ';color:#8fffc0;flex:1';

  const isFlat = new URLSearchParams(window.location.search).get('flat') === '1';
  const modeBtn = mkBtn(actions, isFlat ? '🖥 3D' : '▭ flat', () => {
    const p = new URLSearchParams(window.location.search);
    if (isFlat) p.delete('flat'); else p.set('flat', '1');
    p.set('debug', '1');
    window.location.search = p.toString();
  });
  modeBtn.style.cssText += ';color:#ffd48f;flex:1';

  // ── NAVIGATE: time, room and witness — the spatial spine, close at hand. ──
  const navigate = section('NAVIGATE', 'time · room · witness', true);
  if (opts.onEra || opts.onReveal || opts.onClose) {
    heading(navigate, 'TIME — the rooms age');
    if (opts.onReveal) mkBtn(navigate, 'O7 · first-filing reveal', opts.onReveal);
    if (opts.onEra) for (const [era, label] of ERAS) mkBtn(navigate, label, () => opts.onEra?.(era));
    if (opts.onClose) mkBtn(navigate, 'Close · point cloud', opts.onClose);
  }
  if (opts.onCamProbe) {
    heading(navigate, 'PLACE — desk seats');
    for (const [label, yaw] of ROOMS) mkBtn(navigate, label, () => opts.onCamProbe?.(yaw, 0));
    // ⚑ Session 66 — the two DEVICE seats. They are real marker moves, not
    // camera probes, because the whole point of them now is the side effect:
    // taking one lifts that screen off the furniture into the hand (THE HELD
    // READ, era3Devices.ts). A camProbe would put the camera in the right
    // place with the device still lying on the bed, which is precisely the
    // state this session existed to remove.
    heading(navigate, 'PLACE — Room 2 device seats (held read)');
    for (const [label, node] of [
      ['→ the tablet · comes to hand', 'r2-tablet'],
      ['→ the phone · comes to hand', 'r2-phone'],
      ['→ back to the laptop', 'r2-desk']
    ] as const) {
      mkBtn(navigate, label, () => {
        (window as { __requestMove?: (id: string) => void }).__requestMove?.(node);
      });
    }
  }
  if (opts.onFacet) {
    heading(navigate, 'ROOM 3 — facet');
    mkBtn(navigate, 'Facet — trans-fem', () => opts.onFacet?.('transfem'));
    mkBtn(navigate, 'Facet — trans-masc', () => opts.onFacet?.('transmasc'));
    mkBtn(navigate, 'Facet — non-binary', () => opts.onFacet?.('nonbinary'));
    mkBtn(navigate, 'Facet — all (E3)', () => opts.onFacet?.('all'));
    mkBtn(navigate, 'Facet — none (E1)', () => opts.onFacet?.('none'));
  }
  if (opts.onFlip) {
    heading(navigate, 'WITNESS');
    mkBtn(navigate, 'Flip ⟲ (turn to record)', opts.onFlip);
  }

  // ── SENDS (master script §4) — fire the seam the beats will call; every
  // outcome files to the record (flip to see the cross-reference lines) ──
  if (opts.onSend && opts.sends?.length) {
    const sends = section('SENDS', 'summons seam · offer / visit / decline');
    for (const { id, label } of opts.sends) {
      const row = document.createElement('div');
      row.style.cssText = 'margin:2px 0';
      const lab = document.createElement('div');
      lab.textContent = label;
      lab.style.cssText = 'color:#9aa3b8;font-size:9px;margin-bottom:1px';
      row.appendChild(lab);
      const btns = document.createElement('div');
      btns.style.cssText = 'display:flex;gap:2px';
      const short = { offered: 'offer', visited: 'visit', declined: 'decline' } as const;
      for (const outcome of ['offered', 'visited', 'declined'] as const) {
        const b = document.createElement('button');
        b.textContent = short[outcome];
        Object.assign(b.style, {
          flex: '1', background: '#222838', color: '#cdd3df',
          border: '1px solid #39405270', font: '9px monospace',
          padding: '2px 0', cursor: 'pointer', borderRadius: '3px'
        } as CSSStyleDeclaration);
        b.addEventListener('click', () => opts.onSend?.(id, outcome));
        btns.appendChild(b);
      }
      row.appendChild(btns);
      sends.appendChild(row);
    }
  }

  // ── OS beats (the 2D desktop states) ── grouped/ordered as the piece's spine;
  // see the comment above OS_BEATS for how this stays complete (C6).
  const excluded = new Set(OS_BEAT_EXCLUSIONS);
  let beats: HTMLElement | null = null;
  for (const row of OS_BEATS) {
    if ('heading' in row) {
      beats = section(`DESKTOP · ${row.heading}`, 'monitor state jumps');
      continue;
    }
    if (excluded.has(row.id)) continue; // documented exclusion wins if ever double-listed
    if (beats) mkBtn(beats, row.label, () => os.debugJump(row.id));
  }

  // ── E3 DEVICE BEATS: Room 2's own screens (see E3_DEVICE_BEATS above) ──
  const devices = section('E3 · THE CORRECTION LIST', 'laptop · phone · the light');
  const dnote = document.createElement('div');
  dnote.style.cssText = 'color:#7f8aa3;font-size:9px;line-height:1.4;margin:0 0 3px';
  dnote.textContent = 'needs E3 + Room 2 (era button above, then the laptop/phone seats).';
  devices.appendChild(dnote);
  for (const [label, beat] of E3_DEVICE_BEATS) {
    mkBtn(devices, label, () => {
      const probe = (window as { __graceQueue?: () => { debugBeat(b: string): void } | null }).__graceQueue;
      probe?.()?.debugBeat(beat);
    });
  }

  // ── LINKS: every review URL as a clickable link (Sérgio's ask) ──
  const links = section('REVIEW LINKS', 'open a known state in a fresh URL');
  for (const [label, href] of LINKS) {
    const a = document.createElement('a');
    a.textContent = label;
    a.href = href;
    Object.assign(a.style, {
      display: 'block', margin: '2px 0', color: '#8fb6ff', textDecoration: 'none',
      font: '10px monospace', padding: '1px 2px'
    } as CSSStyleDeclaration);
    a.addEventListener('mouseenter', () => { a.style.textDecoration = 'underline'; });
    a.addEventListener('mouseleave', () => { a.style.textDecoration = 'none'; });
    links.appendChild(a);
  }

  // ── CONTROLS reference ──
  const controls = section('CONTROLS', 'look · turn · movement · map');
  const ctrls = document.createElement('div');
  ctrls.style.cssText = 'color:#9aa3b8;font-size:10px;line-height:1.5';
  ctrls.innerHTML =
    'drag / ← → = look around (never moves rooms)<br>R = home room · F = flip to record<br>' +
    'click a floor marker = blink-jump there (R28-1, markers E3+)<br>` = show/hide this panel';
  controls.appendChild(ctrls);

  document.body.appendChild(panel);
  document.body.appendChild(pill);
  // Keep review captures clear until the reviewer deliberately opens the map.
  show(false);

  window.addEventListener('keydown', (e) => {
    if (e.key === '`' || e.code === 'Backquote') {
      show(panel.style.display === 'none');
      e.preventDefault();
    }
  });
}
