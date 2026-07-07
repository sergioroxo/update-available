/**
 * Debug panel (dev only, ?debug=1) — travel the reinterp build without playing
 * it through. Round 24: rebuilt for LEGIBILITY (Sérgio couldn't tell which
 * version/room he was in — he was on a stale server). It now shows a BUILD TAG,
 * a live "you are here" readout (era + room), clearly-labelled era + room jumps,
 * and a links list of every review URL + the controls. Toggle with backtick (`)
 * or the hide/⚙ buttons.
 */
import { DesktopOS } from '../desktop/os';

/** bump this each build so the panel says which version is on screen */
const BUILD_TAG = 'S16 · batched + send seams';

interface DebugOpts {
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

const OS_BEATS: Array<[string, string]> = [
  ['Off (power)', 'off'],
  ['O2 — LambyOS boot', 'boot'],
  ['O3 — Profile', 'profile'],
  ['O3 — Re-caption', 'recap'],
  ['Desktop', 'desktop'],
  ['Insert kit → O7', 'kit'],
  ['Provotype — pillow', 'pillow'],
  ['Provotype — intake', 'intake']
];

/** eras with the room + identity + year they now lead (Round 24 model) */
const ERAS: Array<['e1' | 'e2' | 'e3' | 'e4', string]> = [
  ['e1', 'E1 1997 · Room 1 (gay teen)'],
  ['e2', 'E2 2003 · Room 1 adult + rooms open'],
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
  ['E2 · rooms open', '?reinterp=1&era=2&debug=1'],
  ['E3 · Vera leads', '?reinterp=1&era=3&debug=1'],
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
    width: '208px', userSelect: 'none'
  } as CSSStyleDeclaration);

  const pill = document.createElement('button');
  pill.textContent = '⚙ debug';
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
  titleText.textContent = 'DEBUG';
  const hideBtn = document.createElement('button');
  hideBtn.textContent = 'hide ✕';
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
  now.style.cssText = 'color:#8fffc0;font-size:10px;margin-bottom:6px;min-height:13px';
  now.textContent = 'here: —';
  panel.appendChild(now);
  // draw calls vs the Quest budget (~50–100, WEBXR_PERFORMANCE_NOTES) + how
  // many props the static batcher folded away (?nobatch=1 to compare raw)
  const perf = document.createElement('div');
  perf.style.cssText = 'color:#9fb4c0;font-size:10px;margin-bottom:6px;min-height:13px';
  perf.textContent = 'draw calls: —';
  panel.appendChild(perf);
  window.setInterval(() => {
    const s = (window as { __reinterpNow?: string }).__reinterpNow;
    now.textContent = 'here: ' + (s ?? '— (open a room)');
    const w = window as { __drawCalls?: number; __batchedProps?: number };
    if (w.__drawCalls !== undefined) {
      perf.textContent = `draw calls: ${w.__drawCalls}` +
        (w.__batchedProps ? ` · batched props: ${w.__batchedProps}` : ' · UNBATCHED');
    }
  }, 250);

  const mkBtn = (label: string, fn: () => void): HTMLButtonElement => {
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
    panel.appendChild(b);
    return b;
  };
  const heading = (text: string): void => {
    const h = document.createElement('div');
    h.textContent = text;
    h.style.cssText = 'color:#7f8aa3;font-size:9px;letter-spacing:0.06em;text-transform:uppercase;margin:8px 0 2px';
    panel.appendChild(h);
  };
  const sep = (): void => {
    const d = document.createElement('div');
    d.style.cssText = 'border-top:1px solid #39405270;margin:6px 0';
    panel.appendChild(d);
  };

  const shotBtn = mkBtn('📷 screenshot', () => {
    const cv = document.querySelector('canvas');
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
  shotBtn.style.color = '#8fffc0';

  const isFlat = new URLSearchParams(window.location.search).get('flat') === '1';
  const modeBtn = mkBtn(isFlat ? '🖥 → 3D room' : '▭ → Flat 2D', () => {
    const p = new URLSearchParams(window.location.search);
    if (isFlat) p.delete('flat'); else p.set('flat', '1');
    p.set('debug', '1');
    window.location.search = p.toString();
  });
  modeBtn.style.color = '#ffd48f';

  // ── ERA (time): change which era the three rooms are aged to ──
  if (opts.onEra || opts.onReveal || opts.onClose) {
    heading('era — the rooms age');
    if (opts.onReveal) mkBtn('O7 · first-filing reveal', opts.onReveal);
    if (opts.onEra) for (const [era, label] of ERAS) mkBtn(label, () => opts.onEra?.(era));
    if (opts.onClose) mkBtn('Close · point cloud', opts.onClose);
  }

  // ── ROOM (place): jump the camera to a room's desk seat ──
  if (opts.onCamProbe) {
    heading('room — jump the camera');
    for (const [label, yaw] of ROOMS) mkBtn(label, () => opts.onCamProbe?.(yaw, 0));
  }

  // ── the trans room's facets (Room 3) ──
  if (opts.onFacet) {
    heading('room 3 facet (trans)');
    mkBtn('Facet — trans-fem', () => opts.onFacet?.('transfem'));
    mkBtn('Facet — trans-masc', () => opts.onFacet?.('transmasc'));
    mkBtn('Facet — non-binary', () => opts.onFacet?.('nonbinary'));
    mkBtn('Facet — all (E3)', () => opts.onFacet?.('all'));
    mkBtn('Facet — none (E1)', () => opts.onFacet?.('none'));
  }
  if (opts.onFlip) {
    heading('witness');
    mkBtn('Flip ⟲ (turn to record)', opts.onFlip);
  }

  // ── SENDS (master script §4) — fire the seam the beats will call; every
  // outcome files to the record (flip to see the cross-reference lines) ──
  if (opts.onSend && opts.sends?.length) {
    heading('sends — the summons seam');
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
      panel.appendChild(row);
    }
  }

  // ── OS beats (the 2D desktop states) ──
  heading('os beats (the monitor)');
  for (const [label, beat] of OS_BEATS) mkBtn(label, () => os.debugJump(beat));

  // ── LINKS: every review URL as a clickable link (Sérgio's ask) ──
  heading('open a state (links)');
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
    panel.appendChild(a);
  }

  // ── CONTROLS reference ──
  heading('controls');
  const ctrls = document.createElement('div');
  ctrls.style.cssText = 'color:#9aa3b8;font-size:10px;line-height:1.5';
  ctrls.innerHTML =
    'drag = look around<br>← → = move between rooms<br>R = home room · F = flip to record<br>` = show/hide this panel';
  panel.appendChild(ctrls);

  sep();
  document.body.appendChild(panel);
  document.body.appendChild(pill);

  window.addEventListener('keydown', (e) => {
    if (e.key === '`' || e.code === 'Backquote') {
      show(panel.style.display === 'none');
      e.preventDefault();
    }
  });
}
