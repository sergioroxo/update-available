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
const PAPER = '#eee3c5';
const PAPER_OLD = '#d7c196';
const CORK = '#9b6a3d';
const CORK_DARK = '#684021';
const POSTIT_YELLOW = '#f2d36b';
const POSTIT_BLUE = '#99c2cf';
const POSTIT_GREEN = '#a8c58b';

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
    font: '14px "Courier New", monospace', color: INK,
    background: 'radial-gradient(circle at 50% 40%, rgba(255,198,111,0.14), rgba(0,0,0,0.18) 58%, rgba(0,0,0,0.38))'
  } as CSSStyleDeclaration);

  const card = document.createElement('div');
  Object.assign(card.style, {
    pointerEvents: 'auto',
    width: 'min(820px, 94vw)', maxHeight: '92vh', overflowY: 'auto',
    boxSizing: 'border-box', padding: '34px 42px 32px',
    position: 'relative', isolation: 'isolate',
    background: [
      'radial-gradient(circle at 8px 10px, rgba(255,244,194,0.42) 0 1px, transparent 1.5px)',
      'radial-gradient(circle at 24px 26px, rgba(80,43,20,0.24) 0 1px, transparent 1.7px)',
      `linear-gradient(135deg, ${CORK}, #b9824d 42%, #8b5931)`
    ].join(', '),
    backgroundSize: '30px 30px, 34px 34px, auto',
    border: '14px solid #6f4323',
    borderTopColor: '#8b5a32', borderLeftColor: '#8b5a32',
    borderRightColor: '#4e2d17', borderBottomColor: '#4e2d17',
    boxShadow: '0 18px 46px rgba(0,0,0,0.62), inset 0 0 0 3px rgba(48,24,9,0.55)',
    borderRadius: '3px', textAlign: 'left'
  } as CSSStyleDeclaration);
  root.appendChild(card);

  const decor = document.createElement('div');
  Object.assign(decor.style, {
    position: 'absolute', inset: '10px', zIndex: '0',
    pointerEvents: 'none', overflow: 'hidden'
  } as CSSStyleDeclaration);
  card.appendChild(decor);

  const content = document.createElement('div');
  Object.assign(content.style, {
    position: 'relative', zIndex: '1',
    width: 'min(560px, 100%)', margin: '0 auto'
  } as CSSStyleDeclaration);
  card.appendChild(content);

  /** thin section rule — the card's whole vertical rhythm hangs on these */
  const rule = (m: string): HTMLElement => {
    const r = document.createElement('div');
    Object.assign(r.style, { borderTop: `2px solid ${CORK_DARK}`, opacity: '0.42', margin: m } as CSSStyleDeclaration);
    return r;
  };

  const pin = (parent: HTMLElement, left: string, top: string, color = '#d9342d'): void => {
    const p = document.createElement('i');
    Object.assign(p.style, {
      position: 'absolute', left, top, width: '11px', height: '11px',
      borderRadius: '50%', background: color,
      boxShadow: '1px 2px 2px rgba(0,0,0,0.35), inset -2px -2px 0 rgba(0,0,0,0.18)'
    } as CSSStyleDeclaration);
    parent.appendChild(p);
  };

  const addScrap = (label: string, left: string, top: string, w: string, h: string, rot: number, bg: string): void => {
    const scrap = document.createElement('div');
    Object.assign(scrap.style, {
      position: 'absolute', left, top, width: w, minHeight: h, transform: `rotate(${rot}deg)`,
      background: bg, border: '1px solid rgba(52,31,18,0.45)',
      boxShadow: '2px 4px 4px rgba(0,0,0,0.22)', boxSizing: 'border-box',
      padding: '7px', color: bg === '#202020' ? '#f3ead2' : '#24170f',
      fontSize: '10px', lineHeight: '1.15', whiteSpace: 'pre-line'
    } as CSSStyleDeclaration);
    scrap.textContent = label;
    decor.appendChild(scrap);
    pin(scrap, '50%', '-5px', '#315db5');
  };

  const stickers = opening.o1_board_stickers as string[];
  addScrap(stickers[0], '18px', '18px', '86px', '42px', -10, '#d8c5df');
  addScrap(stickers[1], '28px', '86px', '78px', '32px', 8, '#d9cf9b');
  addScrap(stickers[2], '610px', '318px', '86px', '36px', -9, '#202020');
  addScrap(stickers[3], '484px', '416px', '74px', '32px', 6, '#b9d7a0');
  addScrap(stickers[4], '676px', '112px', '54px', '30px', 12, '#efcf4a');

  const tickets = opening.o1_board_tickets as string[];
  addScrap(tickets[0], '632px', '20px', '126px', '42px', 7, '#ead6a4');
  addScrap(tickets[1], '640px', '68px', '116px', '34px', -4, '#dfc68e');

  const polaroids = opening.o1_board_polaroids as { caption: string }[];
  const addPolaroid = (caption: string, left: string, top: string, rot: number, mood: string): void => {
    const photo = document.createElement('div');
    Object.assign(photo.style, {
      position: 'absolute', left, top, width: '86px', height: '108px',
      transform: `rotate(${rot}deg)`, background: '#eee9db',
      boxShadow: '2px 5px 5px rgba(0,0,0,0.28)', padding: '6px 6px 18px',
      boxSizing: 'border-box', color: '#24170f', fontSize: '9px', lineHeight: '1.05'
    } as CSSStyleDeclaration);
    const img = document.createElement('div');
    Object.assign(img.style, {
      height: '64px', marginBottom: '5px',
      background: mood,
      boxShadow: 'inset 0 0 18px rgba(255,245,197,0.35)'
    } as CSSStyleDeclaration);
    const people = document.createElement('div');
    Object.assign(people.style, {
      width: '42px', height: '32px', margin: '24px auto 0',
      background: 'radial-gradient(circle at 12px 8px, #f0d0b2 0 5px, transparent 6px), radial-gradient(circle at 28px 8px, #e6c3a1 0 5px, transparent 6px), linear-gradient(90deg, #604735 0 18px, #875b62 18px 36px)',
      opacity: '0.78'
    } as CSSStyleDeclaration);
    img.appendChild(people);
    photo.appendChild(img);
    photo.appendChild(document.createTextNode(caption));
    decor.appendChild(photo);
    pin(photo, '50%', '-5px', '#2f9c51');
  };
  addPolaroid(polaroids[0]?.caption ?? '', '18px', '176px', -8, 'linear-gradient(135deg, #8e6c38, #d8ab63)');
  addPolaroid(polaroids[1]?.caption ?? '', '48px', '310px', 9, 'linear-gradient(135deg, #533f48, #bd9c7a)');
  addPolaroid(polaroids[2]?.caption ?? '', '676px', '144px', 5, 'linear-gradient(135deg, #e7d7bd, #8ca0a3)');
  addPolaroid(polaroids[3]?.caption ?? '', '648px', '270px', -6, 'linear-gradient(135deg, #d7d0b6, #b8816d)');

  const clippings = opening.o1_board_clippings as { title: string; body: string }[];
  for (let i = 0; i < clippings.length; i++) {
    const c = clippings[i];
    addScrap(`${c.title}\n${c.body}`, i === 0 ? '608px' : i === 1 ? '42px' : '576px',
      i === 0 ? '214px' : i === 1 ? '408px' : '390px',
      i === 0 ? '124px' : i === 1 ? '118px' : '132px',
      i === 0 ? '58px' : '62px', i === 1 ? -5 : 4, '#e7dcc5');
  }

  const tapeLabels = opening.o1_board_tape_labels as string[];
  addScrap(tapeLabels[0], '334px', '438px', '108px', '30px', -4, '#d0b5d5');
  addScrap(tapeLabels[1], '232px', '430px', '92px', '28px', 5, '#c8b186');

  // ── logo placeholder slot (asset per REINTERP_LOGO_SPEC, dropped in later) ──
  const logo = document.createElement('div');
  Object.assign(logo.style, {
    position: 'absolute', right: '18px', top: '8px',
    color: '#2b1c13', textShadow: '1px 1px 0 rgba(255,244,194,0.28)',
    fontSize: '10px', fontWeight: '700', letterSpacing: '1px', lineHeight: '1.2'
  } as CSSStyleDeclaration);
  logo.textContent = opening.o1_board_logo_edge;
  const logoSub = document.createElement('div');
  Object.assign(logoSub.style, {
    display: 'none', fontSize: '10px', color: '#7a726a', letterSpacing: '2px', marginTop: '4px',
    fontWeight: '400', textTransform: 'uppercase'
  } as CSSStyleDeclaration);
  logoSub.textContent = opening.o1_logo_sub;
  logo.appendChild(logoSub);
  card.appendChild(logo);

  // ── disclaimer / content warning ──
  const dTitle = document.createElement('div');
  Object.assign(dTitle.style, {
    position: 'relative', width: 'fit-content', maxWidth: '100%', margin: '0 auto 14px',
    padding: '12px 38px 11px',
    background: PAPER, color: '#1f170e',
    boxShadow: '2px 5px 5px rgba(0,0,0,0.22)',
    clipPath: 'polygon(0 8%, 96% 0, 100% 86%, 8% 100%)',
    fontWeight: '700', fontSize: '20px', letterSpacing: '1px',
    textTransform: 'uppercase', textAlign: 'center'
  } as CSSStyleDeclaration);
  dTitle.textContent = opening.o1_disclaimer_title;
  content.appendChild(dTitle);
  pin(dTitle, '12px', '-4px', '#d2b329');
  pin(dTitle, 'calc(100% - 24px)', '-3px', '#d2b329');

  const sheet = document.createElement('div');
  Object.assign(sheet.style, {
    position: 'relative', padding: '20px 24px 18px',
    background: `linear-gradient(100deg, ${PAPER}, #f5edda 60%, ${PAPER_OLD})`,
    color: '#1f170e', boxShadow: '3px 6px 7px rgba(0,0,0,0.25)',
    border: '1px solid rgba(88,58,30,0.22)',
    transform: 'rotate(-0.4deg)'
  } as CSSStyleDeclaration);
  content.appendChild(sheet);
  pin(sheet, '10px', '10px', '#b5312a');
  pin(sheet, 'calc(100% - 22px)', '8px', '#315db5');

  for (const line of opening.o1_disclaimer as string[]) {
    const p = document.createElement('div');
    Object.assign(p.style, {
      fontSize: '13px', lineHeight: '1.6', color: '#1e1710', margin: '0 0 9px'
    } as CSSStyleDeclaration);
    p.textContent = line;
    sheet.appendChild(p);
  }

  const notes = opening.o1_board_margin_notes as string[];
  const scribble = document.createElement('div');
  Object.assign(scribble.style, {
    font: 'italic 12px "Comic Sans MS", "Courier New", monospace',
    color: '#4b3424', textAlign: 'right', marginTop: '-4px'
  } as CSSStyleDeclaration);
  scribble.textContent = notes[0] ?? '';
  sheet.appendChild(scribble);

  const controls = document.createElement('div');
  Object.assign(controls.style, {
    position: 'relative',
    margin: '14px 0 0', padding: '10px 12px', fontSize: '12px', lineHeight: '1.45',
    color: '#24170f', background: '#e7d1a6', borderLeft: `5px solid ${ORANGE_DIM}`,
    boxShadow: '1px 3px 3px rgba(0,0,0,0.18)'
  } as CSSStyleDeclaration);
  const setControlsHint = (): void => {
    controls.textContent = choices.platform === 'vr'
      ? opening.o1_controls_vr : opening.o1_controls_browser;
  };
  setControlsHint();
  content.appendChild(controls);

  // ── start-up options ──
  content.appendChild(rule('18px 0 14px'));
  const opTitle = document.createElement('div');
  Object.assign(opTitle.style, {
    marginBottom: '10px',
    font: 'italic 16px "Comic Sans MS", "Courier New", monospace',
    color: '#2b1c13', textTransform: 'none'
  } as CSSStyleDeclaration);
  opTitle.textContent = opening.o1_options_title;
  content.appendChild(opTitle);

  /** a labelled row of mutually-exclusive post-it buttons — label left, notes
   *  right, one line (wraps only when the board is genuinely narrow) */
  function pillRow(label: string, hint: string | null,
                   buttons: { text: string; on: () => boolean; pick: () => void }[]): HTMLElement {
    const wrap = document.createElement('div');
    Object.assign(wrap.style, {
      margin: '0 0 10px', padding: '9px 11px',
      color: '#24170f', background: 'rgba(238,227,197,0.34)',
      boxShadow: 'inset 0 0 0 1px rgba(90,55,25,0.15)'
    } as CSSStyleDeclaration);
    const line = document.createElement('div');
    Object.assign(line.style, {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '12px', flexWrap: 'wrap'
    } as CSSStyleDeclaration);
    const lab = document.createElement('div');
    Object.assign(lab.style, {
      minWidth: '160px', fontSize: '13px', color: '#2b1c13',
      textShadow: '1px 1px 0 rgba(255,236,167,0.35)'
    } as CSSStyleDeclaration);
    lab.textContent = label;
    line.appendChild(lab);
    const rowEl = document.createElement('div');
    Object.assign(rowEl.style, { display: 'flex', gap: '8px', flexWrap: 'wrap' } as CSSStyleDeclaration);
    const els: { el: HTMLButtonElement; on: () => boolean }[] = [];
    const paint = (): void => {
      for (let i = 0; i < els.length; i++) {
        const { el, on } = els[i];
        const active = on();
        el.style.background = active ? POSTIT_YELLOW : (i % 2 === 0 ? POSTIT_BLUE : PAPER_OLD);
        el.style.color = INK;
        el.style.borderColor = active ? '#b15f16' : 'rgba(52,31,18,0.34)';
        el.style.fontWeight = active ? '700' : '400';
        el.style.transform = active ? 'rotate(-1deg) translateY(-1px)' : `rotate(${i % 2 === 0 ? 1 : -1}deg)`;
        el.style.boxShadow = active
          ? '2px 5px 4px rgba(0,0,0,0.24)'
          : '1px 3px 3px rgba(0,0,0,0.18)';
      }
    };
    for (const b of buttons) {
      const el = document.createElement('button');
      el.textContent = b.text;
      Object.assign(el.style, {
        pointerEvents: 'auto', cursor: 'pointer', font: 'inherit', fontSize: '12px',
        padding: '8px 15px', border: '1px solid rgba(52,31,18,0.34)', borderRadius: '1px',
        clipPath: 'polygon(2% 4%, 98% 0, 100% 94%, 4% 100%)'
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
        maxWidth: '390px', fontSize: '11px', lineHeight: '1.4',
        color: '#4b3424', marginTop: '5px', marginLeft: '2px'
      } as CSSStyleDeclaration);
      h.textContent = hint;
      wrap.appendChild(h);
    }
    paint();
    return wrap;
  }

  content.appendChild(pillRow(opening.o1_platform_label, null, [
    { text: opening.o1_platform_browser, on: () => choices.platform === 'browser',
      pick: () => { choices.platform = 'browser'; setControlsHint(); } },
    { text: opening.o1_platform_vr, on: () => choices.platform === 'vr',
      pick: () => { choices.platform = 'vr'; setControlsHint(); } }
  ]));

  content.appendChild(pillRow(opening.o1_autocam_label, opening.o1_autocam_hint, [
    { text: opening.o1_autocam_on, on: () => choices.autoCam, pick: () => { choices.autoCam = true; } },
    { text: opening.o1_autocam_off, on: () => !choices.autoCam, pick: () => { choices.autoCam = false; } }
  ]));

  // ── continue / leave (Leave works from here on, forever) ──
  content.appendChild(rule('16px 0 16px'));
  const actions = document.createElement('div');
  Object.assign(actions.style, {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
  } as CSSStyleDeclaration);

  const leave = document.createElement('button');
  leave.textContent = opening.o1_leave;
  Object.assign(leave.style, {
    pointerEvents: 'auto', cursor: 'pointer', font: 'inherit', fontSize: '12px',
    padding: '11px 20px', border: '1px solid rgba(52,31,18,0.28)', borderRadius: '1px',
    background: POSTIT_GREEN, color: INK, transform: 'rotate(-2deg)',
    boxShadow: '1px 4px 4px rgba(0,0,0,0.22)'
  } as CSSStyleDeclaration);

  const contWrap = document.createElement('div');
  Object.assign(contWrap.style, {
    display: 'flex', alignItems: 'center', gap: '10px'
  } as CSSStyleDeclaration);
  const wait = document.createElement('span');
  Object.assign(wait.style, { fontSize: '11px', color: '#4b3424' } as CSSStyleDeclaration);
  wait.textContent = `(${opening.o1_wait})`;
  const cont = document.createElement('button');
  cont.textContent = opening.o1_continue;
  Object.assign(cont.style, {
    pointerEvents: 'auto', cursor: 'not-allowed', font: 'inherit', fontWeight: '700',
    fontSize: '13px', padding: '12px 30px', border: '1px solid rgba(52,31,18,0.32)', borderRadius: '1px',
    background: '#9c8560', color: '#3e3326', letterSpacing: '1px',
    transform: 'rotate(1deg)', boxShadow: '1px 4px 4px rgba(0,0,0,0.2)'
  } as CSSStyleDeclaration);
  contWrap.appendChild(wait);
  contWrap.appendChild(cont);

  actions.appendChild(leave);
  actions.appendChild(contWrap);
  content.appendChild(actions);

  const arm = (): void => {
    if (destroyed) return;
    armed = true;
    cont.style.cursor = 'pointer';
    cont.style.background = ORANGE;
    cont.style.color = INK;
    cont.style.boxShadow = '2px 6px 5px rgba(0,0,0,0.28)';
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
    Object.assign(card.style, {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '280px'
    } as CSSStyleDeclaration);
    const note = document.createElement('div');
    Object.assign(note.style, {
      position: 'relative', width: 'min(420px, 86vw)', padding: '24px 28px',
      background: PAPER, color: INK, boxShadow: '3px 7px 8px rgba(0,0,0,0.3)',
      transform: 'rotate(-1deg)', boxSizing: 'border-box'
    } as CSSStyleDeclaration);
    card.appendChild(note);
    pin(note, '16px', '-5px', '#b5312a');
    const t = document.createElement('div');
    Object.assign(t.style, { fontWeight: '700', color: INK, marginBottom: '8px' } as CSSStyleDeclaration);
    t.textContent = opening.o1_leave_title;
    note.appendChild(t);
    for (const line of opening.o1_leave_body as string[]) {
      const p = document.createElement('div');
      Object.assign(p.style, { fontSize: '13px', color: '#2b1c13', lineHeight: '1.5' } as CSSStyleDeclaration);
      p.textContent = line;
      note.appendChild(p);
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
