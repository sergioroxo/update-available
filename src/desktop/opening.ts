/**
 * O1 — the pre-experience start screen (OPENING_AND_FLOW_SPEC §1, §0-REV-1/2/4).
 * Behind ?reinterp=1 only, and only in the 3D engine path: a DOM overlay laid
 * OVER the room so the E1 space (window-lit, monitor dark) stays visible behind
 * the disclaimer — "the controls moment, outside the fiction." The container is
 * pointer-events:none so drag/arrow look-around still reaches the canvas; only
 * the card and its controls take clicks.
 *
 * This surface is deliberately NON-diegetic (the piece's own frame, the one
 * place that's allowed to be) — it never returns once the fiction starts. It is
 * NOT drawn on the monitor canvas; flat mode (the testing fallback) skips it.
 * VR will need an in-scene equivalent later (out of scope here — built browser
 * -first, validated in headset later). All copy is PLACEHOLDER (opening.json).
 */
import opening from '../../data/strings/opening.json';

const ARM_DELAY_MS = 4000; // ethics law: CONTINUE arms only after 4s

export interface StartupChoices {
  platform: 'browser' | 'vr';
  autoCam: boolean;
}

export interface StartupOverlay {
  destroy(): void;
}

interface OverlayOptions {
  onContinue: (choices: StartupChoices) => void;
  onLeave: () => void;
}

const ORANGE = '#f59b23';
const ORANGE_DIM = '#a9540f';
const INK = '#161616';

export function mountStartupOverlay(opts: OverlayOptions): StartupOverlay {
  const choices: StartupChoices = { platform: 'browser', autoCam: false };
  let armed = false;
  let destroyed = false;

  const root = document.createElement('div');
  root.id = 'reinterp-startup';
  Object.assign(root.style, {
    position: 'fixed', inset: '0', zIndex: '20',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'none', // the room behind stays draggable
    font: '14px "Courier New", monospace', color: '#e8e2d4'
  } as CSSStyleDeclaration);

  const card = document.createElement('div');
  Object.assign(card.style, {
    pointerEvents: 'auto',
    width: 'min(680px, 92vw)', maxHeight: '92vh', overflowY: 'auto',
    boxSizing: 'border-box', padding: '22px 26px',
    background: 'rgba(14,12,10,0.86)', border: `2px solid ${INK}`,
    boxShadow: `0 0 0 2px ${ORANGE_DIM}, 0 12px 40px rgba(0,0,0,0.6)`,
    borderRadius: '4px'
  } as CSSStyleDeclaration);
  root.appendChild(card);

  // ── logo placeholder slot (asset per REINTERP_LOGO_SPEC, dropped in later) ──
  const logo = document.createElement('div');
  Object.assign(logo.style, {
    textAlign: 'center', marginBottom: '18px',
    color: ORANGE, textShadow: `1px 1px 0 ${INK}`,
    fontSize: '30px', fontWeight: '700', letterSpacing: '3px'
  } as CSSStyleDeclaration);
  logo.textContent = opening.o1_logo_placeholder;
  const logoSub = document.createElement('div');
  Object.assign(logoSub.style, {
    fontSize: '10px', color: '#7a726a', letterSpacing: '1px', marginTop: '4px'
  } as CSSStyleDeclaration);
  logoSub.textContent = opening.o1_logo_sub;
  logo.appendChild(logoSub);
  card.appendChild(logo);

  // ── disclaimer / content warning ──
  const dTitle = document.createElement('div');
  Object.assign(dTitle.style, { fontWeight: '700', marginBottom: '8px', color: '#f2ede1' } as CSSStyleDeclaration);
  dTitle.textContent = opening.o1_disclaimer_title;
  card.appendChild(dTitle);

  for (const line of opening.o1_disclaimer as string[]) {
    const p = document.createElement('div');
    Object.assign(p.style, { fontSize: '13px', lineHeight: '1.5', color: '#d7d0c2' } as CSSStyleDeclaration);
    p.textContent = line;
    card.appendChild(p);
  }

  const controls = document.createElement('div');
  Object.assign(controls.style, {
    marginTop: '14px', padding: '8px 10px', fontSize: '12px',
    color: '#cbb98f', background: 'rgba(255,255,255,0.04)', borderLeft: `3px solid ${ORANGE_DIM}`
  } as CSSStyleDeclaration);
  const setControlsHint = (): void => {
    controls.textContent = choices.platform === 'vr'
      ? opening.o1_controls_vr : opening.o1_controls_browser;
  };
  setControlsHint();
  card.appendChild(controls);

  // ── start-up options ──
  const opTitle = document.createElement('div');
  Object.assign(opTitle.style, {
    marginTop: '18px', marginBottom: '8px', fontSize: '11px',
    letterSpacing: '2px', color: '#8f867a', textTransform: 'uppercase'
  } as CSSStyleDeclaration);
  opTitle.textContent = opening.o1_options_title;
  card.appendChild(opTitle);

  /** a labelled row of mutually-exclusive pill buttons */
  function pillRow(label: string, hint: string | null,
                   buttons: { text: string; on: () => boolean; pick: () => void }[]): HTMLElement {
    const wrap = document.createElement('div');
    Object.assign(wrap.style, { marginBottom: '12px' } as CSSStyleDeclaration);
    const lab = document.createElement('div');
    Object.assign(lab.style, { fontSize: '12px', marginBottom: '4px', color: '#d7d0c2' } as CSSStyleDeclaration);
    lab.textContent = label;
    wrap.appendChild(lab);
    const rowEl = document.createElement('div');
    Object.assign(rowEl.style, { display: 'flex', gap: '8px', flexWrap: 'wrap' } as CSSStyleDeclaration);
    const els: { el: HTMLButtonElement; on: () => boolean }[] = [];
    const paint = (): void => {
      for (const { el, on } of els) {
        const active = on();
        el.style.background = active ? ORANGE : 'rgba(0,0,0,0.3)';
        el.style.color = active ? INK : '#cbb98f';
        el.style.borderColor = active ? ORANGE : '#4a4038';
        el.style.fontWeight = active ? '700' : '400';
      }
    };
    for (const b of buttons) {
      const el = document.createElement('button');
      el.textContent = b.text;
      Object.assign(el.style, {
        pointerEvents: 'auto', cursor: 'pointer', font: 'inherit', fontSize: '12px',
        padding: '5px 14px', border: '1px solid #4a4038', borderRadius: '3px'
      } as CSSStyleDeclaration);
      el.addEventListener('click', () => { b.pick(); paint(); });
      els.push({ el, on: b.on });
      rowEl.appendChild(el);
    }
    wrap.appendChild(rowEl);
    if (hint) {
      const h = document.createElement('div');
      Object.assign(h.style, { fontSize: '11px', color: '#8f867a', marginTop: '4px' } as CSSStyleDeclaration);
      h.textContent = hint;
      wrap.appendChild(h);
    }
    paint();
    return wrap;
  }

  card.appendChild(pillRow(opening.o1_platform_label, null, [
    { text: opening.o1_platform_browser, on: () => choices.platform === 'browser',
      pick: () => { choices.platform = 'browser'; setControlsHint(); } },
    { text: opening.o1_platform_vr, on: () => choices.platform === 'vr',
      pick: () => { choices.platform = 'vr'; setControlsHint(); } }
  ]));

  card.appendChild(pillRow(opening.o1_autocam_label, opening.o1_autocam_hint, [
    { text: opening.o1_autocam_on, on: () => choices.autoCam, pick: () => { choices.autoCam = true; } },
    { text: opening.o1_autocam_off, on: () => !choices.autoCam, pick: () => { choices.autoCam = false; } }
  ]));

  // ── continue / leave (Leave works from here on, forever) ──
  const actions = document.createElement('div');
  Object.assign(actions.style, {
    display: 'flex', alignItems: 'center', gap: '12px', marginTop: '18px'
  } as CSSStyleDeclaration);

  const cont = document.createElement('button');
  cont.textContent = opening.o1_continue;
  Object.assign(cont.style, {
    pointerEvents: 'auto', cursor: 'not-allowed', font: 'inherit', fontWeight: '700',
    padding: '8px 22px', border: `2px solid ${INK}`, borderRadius: '3px',
    background: '#5a534a', color: '#2a2620'
  } as CSSStyleDeclaration);

  const leave = document.createElement('button');
  leave.textContent = opening.o1_leave;
  Object.assign(leave.style, {
    pointerEvents: 'auto', cursor: 'pointer', font: 'inherit', fontSize: '12px',
    padding: '8px 16px', border: '1px solid #4a4038', borderRadius: '3px',
    background: 'transparent', color: '#cbb98f'
  } as CSSStyleDeclaration);

  const wait = document.createElement('span');
  Object.assign(wait.style, { fontSize: '11px', color: '#7a726a' } as CSSStyleDeclaration);
  wait.textContent = `(${opening.o1_wait})`;

  actions.appendChild(cont);
  actions.appendChild(leave);
  actions.appendChild(wait);
  card.appendChild(actions);

  const arm = (): void => {
    if (destroyed) return;
    armed = true;
    cont.style.cursor = 'pointer';
    cont.style.background = ORANGE;
    cont.style.color = INK;
    wait.style.display = 'none';
  };
  const armTimer = window.setTimeout(arm, ARM_DELAY_MS);

  cont.addEventListener('click', () => {
    if (!armed || destroyed) return;
    opts.onContinue({ ...choices });
  });

  // Leave: swap the card to the (still non-diegetic) exit note, wipe upstream.
  leave.addEventListener('click', () => {
    if (destroyed) return;
    opts.onLeave();
    card.innerHTML = '';
    const t = document.createElement('div');
    Object.assign(t.style, { fontWeight: '700', color: ORANGE, marginBottom: '8px' } as CSSStyleDeclaration);
    t.textContent = opening.o1_leave_title;
    card.appendChild(t);
    for (const line of opening.o1_leave_body as string[]) {
      const p = document.createElement('div');
      Object.assign(p.style, { fontSize: '13px', color: '#d7d0c2', lineHeight: '1.5' } as CSSStyleDeclaration);
      p.textContent = line;
      card.appendChild(p);
    }
  });

  document.body.appendChild(root);

  return {
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      window.clearTimeout(armTimer);
      root.remove();
    }
  };
}
