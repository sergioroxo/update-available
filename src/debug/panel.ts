/**
 * Debug panel (dev only) — jump between beats and spatial states to review the
 * reinterp build without playing it through. PORTED from the shipped build's
 * panel (Sérgio, Round 18: "copy the Debug button system from the previous
 * version so we can travel around"), rescoped to this worktree's beats +
 * the cluster/rig/Close states. Gated behind ?debug=1 so it never ships to
 * players. Toggle with the backtick (`) key or the hide/⚙ buttons.
 */
import { DesktopOS } from '../desktop/os';

interface DebugOpts {
  onEra?: (era: 'e1' | 'e2' | 'e3' | 'e4') => void;
  onReveal?: () => void;
  onClose?: () => void;
  onFacet?: (facet: 'transfem' | 'transmasc' | 'nonbinary' | 'all' | 'none') => void;
  onFlip?: () => void;
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

export function mountDebugPanel(os: DesktopOS, opts: DebugOpts = {}): void {
  if (new URLSearchParams(window.location.search).get('debug') !== '1') return;

  const panel = document.createElement('div');
  Object.assign(panel.style, {
    position: 'fixed', top: '8px', left: '8px', zIndex: '9999',
    background: 'rgba(16,18,26,0.92)', color: '#cdd3df',
    font: '11px/1.4 monospace', padding: '8px', borderRadius: '6px',
    border: '1px solid #3a4154', maxHeight: '92vh', overflowY: 'auto',
    width: '150px', userSelect: 'none'
  } as CSSStyleDeclaration);

  // a tiny re-open pill, shown only when the panel is hidden (backtick is a
  // dead key on many EU layouts, so the panel must be hideable by mouse too)
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
    fontWeight: 'bold', marginBottom: '6px', color: '#8fb6ff',
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
  const sep = (): void => {
    const d = document.createElement('div');
    d.style.cssText = 'border-top:1px solid #39405270;margin:6px 0';
    panel.appendChild(d);
  };

  // 📷 dev screenshot — download the visible canvas as a timestamped PNG.
  // Dev-only (?debug=1); a local canvas → object-URL download — no network,
  // no storage.
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

  // flat ⇄ 3D toggle — reload with/without ?flat=1 (keeps ?debug=1 + ?reinterp=1)
  const isFlat = new URLSearchParams(window.location.search).get('flat') === '1';
  const modeBtn = mkBtn(isFlat ? '🖥 → 3D room' : '▭ → Flat 2D', () => {
    const p = new URLSearchParams(window.location.search);
    if (isFlat) p.delete('flat'); else p.set('flat', '1');
    p.set('debug', '1');
    window.location.search = p.toString();
  });
  modeBtn.style.color = '#ffd48f';
  sep();

  for (const [label, beat] of OS_BEATS) mkBtn(label, () => os.debugJump(beat));

  if (opts.onReveal || opts.onEra || opts.onClose) {
    sep();
    if (opts.onReveal) mkBtn('Reveal (O7 state)', opts.onReveal);
    if (opts.onEra) {
      mkBtn('Era 1 rig', () => opts.onEra?.('e1'));
      mkBtn('Era 2 — morph open', () => opts.onEra?.('e2'));
      mkBtn('Era 3 — morph open', () => opts.onEra?.('e3'));
      mkBtn('Era 4 — morph open', () => opts.onEra?.('e4'));
    }
    if (opts.onClose) mkBtn('Close — point cloud', opts.onClose);
  }
  if (opts.onFacet) {
    sep();
    mkBtn('Facet — trans-fem', () => opts.onFacet?.('transfem'));
    mkBtn('Facet — trans-masc', () => opts.onFacet?.('transmasc'));
    mkBtn('Facet — non-binary', () => opts.onFacet?.('nonbinary'));
    mkBtn('Facet — all (E3)', () => opts.onFacet?.('all'));
    mkBtn('Facet — none (E1)', () => opts.onFacet?.('none'));
  }
  if (opts.onFlip) {
    sep();
    mkBtn('Flip ⟲ (witness)', opts.onFlip);
  }

  document.body.appendChild(panel);
  document.body.appendChild(pill);

  // toggle on backtick by physical key (Backquote) so dead-key layouts work
  window.addEventListener('keydown', (e) => {
    if (e.key === '`' || e.code === 'Backquote') {
      show(panel.style.display === 'none');
      e.preventDefault();
    }
  });
}
