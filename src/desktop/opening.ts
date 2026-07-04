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
    width: 'min(560px, 92vw)', maxHeight: '90vh', overflowY: 'auto',
    boxSizing: 'border-box', padding: '28px 32px',
    background: 'rgba(12,11,9,0.92)', border: `1px solid ${ORANGE_DIM}`,
    boxShadow: '0 16px 48px rgba(0,0,0,0.65)',
    borderRadius: '6px', textAlign: 'left'
  } as CSSStyleDeclaration);
  root.appendChild(card);

  /** thin section rule — the card's whole vertical rhythm hangs on these */
  const rule = (m: string): HTMLElement => {
    const r = document.createElement('div');
    Object.assign(r.style, { borderTop: '1px solid rgba(169,84,15,0.35)', margin: m } as CSSStyleDeclaration);
    return r;
  };

  // ── logo placeholder slot (asset per REINTERP_LOGO_SPEC, dropped in later) ──
  const logo = document.createElement('div');
  Object.assign(logo.style, {
    textAlign: 'center', margin: '0 0 6px',
    color: ORANGE, textShadow: `1px 1px 0 ${INK}`,
    fontSize: '26px', fontWeight: '700', letterSpacing: '4px', lineHeight: '1.2'
  } as CSSStyleDeclaration);
  logo.textContent = opening.o1_logo_placeholder;
  const logoSub = document.createElement('div');
  Object.assign(logoSub.style, {
    fontSize: '10px', color: '#7a726a', letterSpacing: '2px', marginTop: '4px',
    fontWeight: '400', textTransform: 'uppercase'
  } as CSSStyleDeclaration);
  logoSub.textContent = opening.o1_logo_sub;
  logo.appendChild(logoSub);
  card.appendChild(logo);
  card.appendChild(rule('16px 0 18px'));

  // ── disclaimer / content warning ──
  const dTitle = document.createElement('div');
  Object.assign(dTitle.style, {
    fontWeight: '700', marginBottom: '10px', color: '#f2ede1',
    fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase'
  } as CSSStyleDeclaration);
  dTitle.textContent = opening.o1_disclaimer_title;
  card.appendChild(dTitle);

  for (const line of opening.o1_disclaimer as string[]) {
    const p = document.createElement('div');
    Object.assign(p.style, {
      fontSize: '13px', lineHeight: '1.65', color: '#d7d0c2', margin: '0 0 8px'
    } as CSSStyleDeclaration);
    p.textContent = line;
    card.appendChild(p);
  }

  const controls = document.createElement('div');
  Object.assign(controls.style, {
    margin: '14px 0 0', padding: '9px 12px', fontSize: '12px', lineHeight: '1.5',
    color: '#cbb98f', background: 'rgba(255,255,255,0.04)', borderLeft: `3px solid ${ORANGE_DIM}`,
    borderRadius: '0 3px 3px 0'
  } as CSSStyleDeclaration);
  const setControlsHint = (): void => {
    controls.textContent = choices.platform === 'vr'
      ? opening.o1_controls_vr : opening.o1_controls_browser;
  };
  setControlsHint();
  card.appendChild(controls);

  // ── start-up options ──
  card.appendChild(rule('18px 0 14px'));
  const opTitle = document.createElement('div');
  Object.assign(opTitle.style, {
    marginBottom: '10px', fontSize: '11px', fontWeight: '700',
    letterSpacing: '2px', color: '#8f867a', textTransform: 'uppercase'
  } as CSSStyleDeclaration);
  opTitle.textContent = opening.o1_options_title;
  card.appendChild(opTitle);

  /** a labelled row of mutually-exclusive pill buttons — label left, pills
   *  right, one line (wraps only when the card is genuinely narrow) */
  function pillRow(label: string, hint: string | null,
                   buttons: { text: string; on: () => boolean; pick: () => void }[]): HTMLElement {
    const wrap = document.createElement('div');
    Object.assign(wrap.style, { margin: '0 0 10px' } as CSSStyleDeclaration);
    const line = document.createElement('div');
    Object.assign(line.style, {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '12px', flexWrap: 'wrap'
    } as CSSStyleDeclaration);
    const lab = document.createElement('div');
    Object.assign(lab.style, { fontSize: '12.5px', color: '#d7d0c2' } as CSSStyleDeclaration);
    lab.textContent = label;
    line.appendChild(lab);
    const rowEl = document.createElement('div');
    Object.assign(rowEl.style, { display: 'flex', gap: '6px', flexWrap: 'wrap' } as CSSStyleDeclaration);
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
    line.appendChild(rowEl);
    wrap.appendChild(line);
    if (hint) {
      const h = document.createElement('div');
      Object.assign(h.style, {
        fontSize: '11px', lineHeight: '1.5', color: '#8f867a', marginTop: '4px'
      } as CSSStyleDeclaration);
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
  card.appendChild(rule('16px 0 16px'));
  const actions = document.createElement('div');
  Object.assign(actions.style, {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
  } as CSSStyleDeclaration);

  const leave = document.createElement('button');
  leave.textContent = opening.o1_leave;
  Object.assign(leave.style, {
    pointerEvents: 'auto', cursor: 'pointer', font: 'inherit', fontSize: '12px',
    padding: '9px 16px', border: '1px solid #4a4038', borderRadius: '3px',
    background: 'transparent', color: '#cbb98f'
  } as CSSStyleDeclaration);

  const contWrap = document.createElement('div');
  Object.assign(contWrap.style, {
    display: 'flex', alignItems: 'center', gap: '10px'
  } as CSSStyleDeclaration);
  const wait = document.createElement('span');
  Object.assign(wait.style, { fontSize: '11px', color: '#7a726a' } as CSSStyleDeclaration);
  wait.textContent = `(${opening.o1_wait})`;
  const cont = document.createElement('button');
  cont.textContent = opening.o1_continue;
  Object.assign(cont.style, {
    pointerEvents: 'auto', cursor: 'not-allowed', font: 'inherit', fontWeight: '700',
    fontSize: '13px', padding: '9px 26px', border: `2px solid ${INK}`, borderRadius: '3px',
    background: '#5a534a', color: '#2a2620', letterSpacing: '1px'
  } as CSSStyleDeclaration);
  contWrap.appendChild(wait);
  contWrap.appendChild(cont);

  actions.appendChild(leave);
  actions.appendChild(contWrap);
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
