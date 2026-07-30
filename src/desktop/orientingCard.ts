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
 * It ends in LOG IN, plus ENTER VR only when this browser has confirmed an
 * immersive-vr session is available. Either wakes the same room — the main
 * light comes up and the machine boots by itself (src/engine/app.ts's wake
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
import { prepareImmersiveVrEntry, requestImmersiveVrEntry } from '../engine/app';
import { wipeLedger } from '../state/ledger';

const ARM_DELAY_MS = 4000; // the ethics arm-delay: "enter" can never be instant

/**
 * S53 — TRANSPARENCY. Sérgio, second playthrough: "I would like to see a little
 * bit of transparency on the beginning screen… that way we 'enter' the room."
 * The panel is no longer an opaque slab over the whole viewport: the backdrop
 * is a VEIL (a radial one — densest behind the card where the type sits,
 * thinning toward the edges, so whatever is behind reads at the periphery
 * where nothing has to be read), and the card itself sits at 0.90 over a blur.
 *
 * READABILITY WINS, per the brief, and it is bought twice over: the blur
 * destroys any competing detail behind the type before the alpha is even
 * considered, and where `backdrop-filter` is unsupported the whole thing simply
 * goes near-opaque instead of trusting alpha alone. This panel carries the
 * content note and the controls; it is an accessibility surface first.
 *
 * ⚑ DORMANT TODAY — and this is the honest state of it, not an oversight.
 * src/main.ts starts the engine only in this panel's own continue callback, so
 * there is nothing rendering behind it yet: the veil currently reveals the
 * page's black. It becomes what Sérgio asked for the moment the moonlit room
 * is drawn behind the panel, which needs a start-order change in main.ts (out
 * of this session's file fence) AND a decision that is his, not a build
 * session's: the fiction's space would then exist on screen BEHIND the content
 * note, before that note has been acknowledged (ETHICS_CONSTRAINTS #4 — the
 * warning is "up front", with the 4s arm-delay). See the S53 session-log entry.
 */
const SUPPORTS_BLUR = typeof CSS !== 'undefined'
  && typeof CSS.supports === 'function'
  && (CSS.supports('backdrop-filter', 'blur(2px)') || CSS.supports('-webkit-backdrop-filter', 'blur(2px)'));
/** veil density behind the card / at the edges, and the card's own alpha —
 *  all raised toward opaque when there is no blur to protect the type */
const VEIL_CORE = SUPPORTS_BLUR ? 0.86 : 0.96;
const VEIL_EDGE = SUPPORTS_BLUR ? 0.55 : 0.82;
const CARD_ALPHA = SUPPORTS_BLUR ? 0.90 : 0.98;

/**
 * The frame's own palette — plain greys, one warm accent for the single live
 * action. Declared once here (CLAUDE.md pixel discipline is about the era
 * palettes in src/desktop/theme/; this DOM chrome is deliberately outside the
 * fiction and outside those palettes, exactly like src/desktop/gameMenu.ts).
 */
const FRAME = {
  backdropRGB: '8, 8, 10',
  panelRGB: '16, 16, 20',
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
    // the veil: densest across the middle where the card sits, thinning to the
    // corners — the space reads around the panel, never under the type
    background: `radial-gradient(ellipse at center, `
      + `rgba(${FRAME.backdropRGB}, ${VEIL_CORE}) 0%, `
      + `rgba(${FRAME.backdropRGB}, ${VEIL_CORE}) 38%, `
      + `rgba(${FRAME.backdropRGB}, ${VEIL_EDGE}) 100%)`,
    font: '14px "Courier New", monospace', color: FRAME.body
  } as CSSStyleDeclaration);
  if (SUPPORTS_BLUR) {
    root.style.backdropFilter = 'blur(3px)';
    root.style.setProperty('-webkit-backdrop-filter', 'blur(3px)');
  }

  const card = document.createElement('div');
  Object.assign(card.style, {
    width: 'min(660px, 96vw)', margin: 'auto', boxSizing: 'border-box',
    padding: '30px 34px',
    background: `rgba(${FRAME.panelRGB}, ${CARD_ALPHA})`,
    border: `1px solid ${FRAME.edge}`, borderRadius: '2px'
  } as CSSStyleDeclaration);
  if (SUPPORTS_BLUR) {
    // a heavier blur than the veil's: behind the words, nothing behind the
    // words survives as detail — only as light
    card.style.backdropFilter = 'blur(12px)';
    card.style.setProperty('-webkit-backdrop-filter', 'blur(12px)');
  }
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

  // ── entry actions (+ Leave, which always works) ──
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
  let enterVr: HTMLButtonElement | null = null;

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
    const enable = (button: HTMLButtonElement): void => {
      button.disabled = false;
      button.style.cursor = 'pointer';
      button.style.background = FRAME.action;
      button.style.color = FRAME.actionInk;
    };
    enable(enter);
    if (enterVr) enable(enterVr);
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

  // `?flat=1` is the universal canvas-only fallback: do not even probe or
  // prepare WebXR there. On every other path, unsupported browsers receive no
  // extra element and retain the exact existing LOG IN flow.
  if (new URLSearchParams(window.location.search).get('flat') !== '1' && navigator.xr) {
    void navigator.xr.isSessionSupported('immersive-vr').then(async (supported) => {
      if (!supported || destroyed) return;
      const canvas = document.getElementById('app');
      if (!(canvas instanceof HTMLCanvasElement)) return;
      const ready = await prepareImmersiveVrEntry(canvas);
      if (!ready || destroyed || !actions.isConnected) return;

      enterVr = document.createElement('button');
      enterVr.textContent = copy.enterVrLabel;
      enterVr.disabled = !armed;
      Object.assign(enterVr.style, {
        font: 'inherit', fontWeight: '700', fontSize: '13px', padding: '10px 26px',
        border: `1px solid ${FRAME.edge}`, borderRadius: '2px',
        cursor: armed ? 'pointer' : 'not-allowed',
        background: armed ? FRAME.action : FRAME.rule,
        color: armed ? FRAME.actionInk : FRAME.ghost,
        letterSpacing: '1px'
      } as CSSStyleDeclaration);
      enterVr.addEventListener('click', () => {
        if (!armed || destroyed) return;
        // startApp consumes this flag synchronously inside onContinue's click
        // stack, before model preloading can yield and lose user activation.
        requestImmersiveVrEntry();
        onContinue();
      });
      actions.insertBefore(enterVr, leave);
    }).catch(() => {
      // Availability failure is the unsupported path: leave the card exactly
      // as it was, with LOG IN as its sole entry action.
    });
  }

  return {
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      window.clearTimeout(armTimer);
      root.remove();
    }
  };
}
