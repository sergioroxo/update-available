/**
 * THE INTERIM LOG-IN PANEL — the front door (docs/
 * REINTERP_OPENING_DECISION_2026-07-24.md §2, which supersedes R28 §4's
 * three-layer opening; this surface is the evolution of layer 1's minimal
 * orienting card, D43/Session 36).
 *
 * Shown ONCE, before anything else, on a fresh reinterp load. It carries the
 * whole pre-fiction weight now that the in-room cork board is retired
 * (decision §1): what the project is, the content note, and HOW TO MOVE
 * shown for BOTH a headset and a computer — an actual controls display, not
 * a one-line hint. That is an accessibility surface as much as an
 * orientation one: everything the piece will ever ask of the body is listed
 * here, in plain type, before a single thing happens.
 *
 * It ends in ONE action: LOG IN. Pressing it wakes the room — the main light
 * comes up and the machine boots by itself (src/engine/app.ts's wake
 * sequence; decision §3). Nothing else is required of the player, ever: the
 * old optional power-press is gone.
 *
 * Frame voice (CLAUDE.md: "the frame never plays"): plain type, no cork, no
 * fiction, no decoration, no timers except the ethics arm-delay below —
 * Continue/Log in cannot be hit instantly, so the content note has to sit
 * there for a beat (the same 4s law the shipped O1 used). Leave always works,
 * from the first frame, and ends in an inert page rather than starting
 * anything.
 *
 * Mounted (see src/main.ts) alongside the game menu, before either engine
 * starts, so Esc/the pause glyph already work while this panel is showing.
 */
import copy from '../../data/strings/orientingCard.json';
import { wipeLedger } from '../state/ledger';

const ARM_DELAY_MS = 4000; // the ethics arm-delay: "enter" can never be instant

/**
 * The frame's own palette — plain greys, one warm accent for the single live
 * action. Declared once here (CLAUDE.md pixel discipline is about the era
 * palettes in src/desktop/theme/; this DOM chrome is deliberately outside the
 * fiction and outside those palettes, exactly like src/desktop/gameMenu.ts).
 */
const FRAME = {
  backdrop: '#08080a',
  panel: '#101014',
  edge: '#383840',
  rule: '#26262e',
  ink: '#f2f4f8',
  body: '#dfe3ea',
  dim: '#b7bcc6',
  faint: '#9aa0ac',
  ghost: '#6f7480',
  action: '#e8dcc0',
  actionInk: '#141414'
} as const;

export interface OrientingCard {
  destroy(): void;
}

export function mountOrientingCard(onContinue: () => void): OrientingCard {
  let armed = false;
  let destroyed = false;

  const root = document.createElement('div');
  root.id = 'reinterp-orienting-card';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', copy.title);
  Object.assign(root.style, {
    position: 'fixed', inset: '0', zIndex: '900', // below the game menu (1000) — Esc still shows on top
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflowY: 'auto', padding: '24px 16px', boxSizing: 'border-box',
    background: FRAME.backdrop,
    font: '14px "Courier New", monospace', color: FRAME.body
  } as CSSStyleDeclaration);

  const card = document.createElement('div');
  Object.assign(card.style, {
    width: 'min(660px, 96vw)', margin: 'auto', boxSizing: 'border-box',
    padding: '30px 34px',
    background: FRAME.panel, border: `1px solid ${FRAME.edge}`, borderRadius: '2px'
  } as CSSStyleDeclaration);
  root.appendChild(card);

  const line = (text: string, style: Partial<CSSStyleDeclaration>): HTMLDivElement => {
    const el = document.createElement('div');
    el.textContent = text;
    Object.assign(el.style, style as CSSStyleDeclaration);
    return el;
  };

  // ── what this is ──
  card.appendChild(line(copy.title, {
    fontSize: '13px', letterSpacing: '2px', color: FRAME.faint, marginBottom: '6px'
  }));
  card.appendChild(line(copy.subtitle, {
    fontSize: '11px', lineHeight: '1.5', color: FRAME.ghost, marginBottom: '20px'
  }));
  card.appendChild(line(copy.premise, {
    fontSize: '16px', lineHeight: '1.5', color: FRAME.ink, marginBottom: '14px'
  }));
  card.appendChild(line(copy.about, {
    fontSize: '12.5px', lineHeight: '1.6', color: FRAME.dim, marginBottom: '14px'
  }));
  card.appendChild(line(copy.contentNote, {
    fontSize: '12.5px', lineHeight: '1.6', color: FRAME.dim, marginBottom: '22px'
  }));

  // ── how to move: BOTH platforms, always both, never a device sniff (the
  // player may be about to put a headset on; and a listed control you cannot
  // use still tells you what the piece will ask of a body) ──
  const rule = (): HTMLDivElement => line('', {
    height: '1px', background: FRAME.rule, margin: '0 0 18px'
  });
  card.appendChild(rule());
  card.appendChild(line(copy.controlsTitle, {
    fontSize: '11px', letterSpacing: '2px', color: FRAME.faint, marginBottom: '14px'
  }));

  const columns = document.createElement('div');
  Object.assign(columns.style, {
    display: 'flex', flexWrap: 'wrap', gap: '22px', marginBottom: '14px'
  } as CSSStyleDeclaration);
  card.appendChild(columns);

  const controlBlock = (heading: string, lines: string[]): void => {
    const col = document.createElement('div');
    Object.assign(col.style, { flex: '1 1 240px', minWidth: '220px' } as CSSStyleDeclaration);
    col.appendChild(line(heading, {
      fontSize: '12px', color: FRAME.ink, marginBottom: '8px'
    }));
    const list = document.createElement('ul');
    Object.assign(list.style, {
      margin: '0', padding: '0 0 0 16px', listStyle: 'square'
    } as CSSStyleDeclaration);
    for (const text of lines) {
      const li = document.createElement('li');
      li.textContent = text;
      Object.assign(li.style, {
        fontSize: '12px', lineHeight: '1.6', color: FRAME.dim, marginBottom: '4px'
      } as CSSStyleDeclaration);
      list.appendChild(li);
    }
    col.appendChild(list);
    columns.appendChild(col);
  };
  controlBlock(copy.controlsDesktopHeading, copy.controlsDesktopLines);
  controlBlock(copy.controlsHeadsetHeading, copy.controlsHeadsetLines);

  card.appendChild(line(copy.controlsNote, {
    fontSize: '12px', lineHeight: '1.6', color: FRAME.faint, marginBottom: '22px'
  }));
  card.appendChild(rule());

  // ── the one action (+ Leave, which always works) ──
  const actions = document.createElement('div');
  Object.assign(actions.style, {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px'
  } as CSSStyleDeclaration);

  const enter = document.createElement('button');
  enter.textContent = copy.enterLabel;
  enter.disabled = true;
  Object.assign(enter.style, {
    font: 'inherit', fontWeight: '700', fontSize: '13px', padding: '10px 26px',
    border: `1px solid ${FRAME.edge}`, borderRadius: '2px', cursor: 'not-allowed',
    background: FRAME.rule, color: FRAME.ghost, letterSpacing: '1px'
  } as CSSStyleDeclaration);

  const leave = document.createElement('button');
  leave.textContent = copy.leaveLabel;
  Object.assign(leave.style, {
    font: 'inherit', fontSize: '12px', padding: '9px 18px',
    border: `1px solid ${FRAME.edge}`, borderRadius: '2px', cursor: 'pointer',
    background: 'transparent', color: FRAME.dim
  } as CSSStyleDeclaration);

  const wait = line(`(${copy.wait})`, { fontSize: '11px', color: FRAME.ghost });
  const enterNote = line(copy.enterNote, {
    fontSize: '11px', color: FRAME.ghost, display: 'none'
  });

  actions.appendChild(enter);
  actions.appendChild(leave);
  actions.appendChild(wait);
  actions.appendChild(enterNote);
  card.appendChild(actions);

  const arm = (): void => {
    if (destroyed) return;
    armed = true;
    enter.disabled = false;
    enter.style.cursor = 'pointer';
    enter.style.background = FRAME.action;
    enter.style.color = FRAME.actionInk;
    wait.style.display = 'none';
    enterNote.style.display = 'block';
  };
  const armTimer = window.setTimeout(arm, ARM_DELAY_MS);

  enter.addEventListener('click', () => {
    if (!armed || destroyed) return;
    onContinue();
  });

  /** Leave, before anything has started: nothing to hand off to (the engine
   *  does not exist yet, so gameMenuBus.leaveEngine is still null) — so this
   *  wipes the in-memory ledger and leaves an inert page. Deliberately NOT a
   *  reload: a reload would put the player back at this same door, which is
   *  not what "leave" means. */
  const doLeave = (): void => {
    if (destroyed) return;
    wipeLedger();
    window.clearTimeout(armTimer);
    armed = false;
    card.replaceChildren(
      line(copy.leftTitle, { fontSize: '16px', color: FRAME.ink, marginBottom: '10px' }),
      line(copy.leftBody, { fontSize: '12.5px', lineHeight: '1.6', color: FRAME.dim })
    );
  };
  leave.addEventListener('click', doLeave);

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
