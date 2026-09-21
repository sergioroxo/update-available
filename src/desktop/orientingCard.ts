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
import { ledger, wipeLedger } from '../state/ledger';
import { DIALOG, domBevel } from './theme/chrome';

const ARM_DELAY_MS = 4000; // the ethics arm-delay: "enter" can never be instant
/** S166 — the version on the door, from package.json at build (vite.config.ts) */
declare const __APP_VERSION__: string;
const VERSION_TAG = copy.versionTag.replace('{v}', typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0');

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

/**
 * ⚑ S162 / R3-01 — THE 1997 MACHINE'S OWN CHROME. Sérgio (round 3): "the start-up
 * menu needs a revamp: computer thematics, the logo, how the information is
 * displayed, the text must make sense." So the panel is a 1997 dialog — the
 * shared `DIALOG` tokens (theme/chrome.ts, ERA1 only — never invented here), a
 * title bar, bevelled buttons, a checkbox, group boxes. The VEIL behind it stays
 * the frame's own dark, and the words stay frame voice — the chrome is the
 * machine's, nothing on it plays. The mark at the top is an interim CRT drawn
 * in code; his logo file (his ask) replaces `drawMark` when it arrives.
 */
const FRAME = {
  backdropRGB: DIALOG.veilRGB,
  panel: DIALOG.panel,
  panelLight: DIALOG.light,
  panelDark: DIALOG.dark,
  panelDarker: DIALOG.darker,
  titleBar: DIALOG.titleBar,
  titleInk: DIALOG.titleInk,
  ink: DIALOG.ink,
  dim: DIALOG.dim,
  faint: DIALOG.faint,
  screen: DIALOG.screen,
  screenDark: DIALOG.screenDark,
  paper: DIALOG.paper
} as const;

export interface OrientingCard {
  destroy(): void;
}

/** which way in was chosen at the door — `phone` has already asked the device */
export type DoorChoice = 'desktop' | 'phone' | 'headset';

export function mountOrientingCard(onContinue: (choice: DoorChoice) => void): OrientingCard {
  let armed = false;
  let destroyed = false;
  let entered = false;

  const root = document.createElement('div');
  root.id = 'reinterp-orienting-card';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', copy.title);
  Object.assign(root.style, {
    position: 'fixed', inset: '0', zIndex: '900', // below the game menu (1000) — Esc still shows on top
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflowY: 'auto', padding: '24px 16px', boxSizing: 'border-box',
    // the veil: densest across the middle where the dialog sits, thinning to
    // the corners — the space reads around the panel, never under the type
    background: `radial-gradient(ellipse at center, `
      + `rgba(${FRAME.backdropRGB}, ${VEIL_CORE}) 0%, `
      + `rgba(${FRAME.backdropRGB}, ${VEIL_CORE}) 38%, `
      + `rgba(${FRAME.backdropRGB}, ${VEIL_EDGE}) 100%)`,
    // the machine's type: a small sans, the way a 1997 dialog set it — a system
    // face, never a download (no fonts are fetched anywhere in the piece)
    font: DIALOG.font, color: FRAME.ink
  } as CSSStyleDeclaration);
  if (SUPPORTS_BLUR) {
    root.style.backdropFilter = 'blur(3px)';
    root.style.setProperty('-webkit-backdrop-filter', 'blur(3px)');
  }

  const bevel = domBevel;

  // ── the dialog ──
  const card = document.createElement('div');
  Object.assign(card.style, {
    // ⚑ 900, not 660 (2026-08-12, Sérgio on a real iPad: "the panel at the
    //  beginning should also be wider on an iPad because it gets cut off").
    //  Three cards in a row need 3×220 + 2×18 gap + padding ≈ 760px.
    width: 'min(900px, 96vw)', margin: 'auto', boxSizing: 'border-box',
    background: FRAME.panel, padding: '0'
  } as CSSStyleDeclaration);
  bevel(card);
  root.appendChild(card);

  const line = (text: string, style: Partial<CSSStyleDeclaration>): HTMLDivElement => {
    const el = document.createElement('div');
    el.textContent = text;
    Object.assign(el.style, style as CSSStyleDeclaration);
    return el;
  };

  // the title bar — the dialog's, not a window anyone can move
  const titleBar = document.createElement('div');
  Object.assign(titleBar.style, {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: FRAME.titleBar, color: FRAME.titleInk, padding: '4px 6px',
    fontWeight: '700', fontSize: '12px', margin: '2px'
  } as CSSStyleDeclaration);
  titleBar.appendChild(drawMark(16));
  titleBar.appendChild(line(copy.titleBar, { flex: '1' }));
  titleBar.appendChild(line(VERSION_TAG, { fontSize: '11px', fontWeight: '400', opacity: '0.85' }));
  card.appendChild(titleBar);

  const inner = document.createElement('div');
  Object.assign(inner.style, { padding: '14px 18px 16px' } as CSSStyleDeclaration);
  card.appendChild(inner);

  // ── what this is: the mark, the title, the premise ──
  const masthead = document.createElement('div');
  Object.assign(masthead.style, { display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '12px' } as CSSStyleDeclaration);
  masthead.appendChild(drawMark(56));
  const mastText = document.createElement('div');
  const titleRow = document.createElement('div');
  Object.assign(titleRow.style, { display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', marginBottom: '2px' } as CSSStyleDeclaration);
  titleRow.appendChild(line(copy.title, { fontSize: '15px', fontWeight: '700', letterSpacing: '1px', color: FRAME.ink }));
  const tag = line(VERSION_TAG, { fontSize: '10px', color: FRAME.ink, padding: '1px 6px', background: FRAME.paper });
  bevel(tag, true, 1);
  titleRow.appendChild(tag);
  mastText.appendChild(titleRow);
  mastText.appendChild(line(copy.subtitle, { fontSize: '11px', color: FRAME.dim, marginBottom: '8px' }));
  mastText.appendChild(line(copy.premise, { fontSize: '13px', lineHeight: '1.5', color: FRAME.ink }));
  masthead.appendChild(mastText);
  inner.appendChild(masthead);

  // the notes, on the dialog's own paper (a sunk field, as a 1997 dialog set its text)
  const notes = document.createElement('div');
  Object.assign(notes.style, { background: FRAME.paper, padding: '10px 12px', marginBottom: '14px' } as CSSStyleDeclaration);
  bevel(notes, true);
  notes.appendChild(line(copy.about, { fontSize: '12px', lineHeight: '1.55', color: FRAME.ink, marginBottom: '8px' }));
  notes.appendChild(line(copy.contentNote, { fontSize: '12px', lineHeight: '1.55', color: FRAME.ink, marginBottom: '8px' }));
  // ⚑ S77 — THE DEADNAME ADVISORY, and this panel is the only place it can
  // honestly go (08_STATUS_REGISTER §8 decision 9). An IN-FICTION advisory would
  // make the apparatus the thing offering you protection from itself, which is
  // the exact move the piece spends four eras describing. So it sits here,
  // outside the fiction, behind the same 4 s ethics arm-delay as the content
  // note, and it says where the setting is rather than being the setting.
  // ⚑ It names what happens without naming any character or spoiling any beat,
  // and it states the piece's position plainly: the system is wrong.
  notes.appendChild(line(copy.nameNote, { fontSize: '12px', lineHeight: '1.55', color: FRAME.ink }));
  inner.appendChild(notes);

  // ── F-01: THE CHOICES. Three cards, one per way of being here; each lists what
  //   it will ask of a body and carries its own way in. All three are always
  //   shown — never a device sniff: a listed control you cannot use still tells
  //   you what the piece asks (an accessibility surface as much as a door). ──
  inner.appendChild(line(copy.chooseTitle, { fontSize: '13px', fontWeight: '700', color: FRAME.ink, marginBottom: '4px' }));
  inner.appendChild(line(copy.chooseNote, { fontSize: '11.5px', lineHeight: '1.5', color: FRAME.dim, marginBottom: '10px' }));

  const columns = document.createElement('div');
  Object.assign(columns.style, { display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '12px' } as CSSStyleDeclaration);
  inner.appendChild(columns);

  const button = (label: string): HTMLButtonElement => {
    const b = document.createElement('button');
    b.textContent = label;
    Object.assign(b.style, {
      font: 'inherit', fontSize: '12px', padding: '6px 14px', cursor: 'pointer',
      background: FRAME.panel, color: FRAME.ink, borderRadius: '0', whiteSpace: 'nowrap'
    } as CSSStyleDeclaration);
    bevel(b);
    return b;
  };
  const disable = (b: HTMLButtonElement, on: boolean): void => {
    b.disabled = on;
    b.style.cursor = on ? 'not-allowed' : 'pointer';
    b.style.color = on ? FRAME.faint : FRAME.ink;
  };

  interface Card { heading: string; lines: string[]; button: string }
  const entryButtons: HTMLButtonElement[] = [];
  const choiceCard = (c: Card, withButton: boolean): { col: HTMLDivElement; foot: HTMLDivElement; btn: HTMLButtonElement | null } => {
    const col = document.createElement('div');
    Object.assign(col.style, {
      flex: '1 1 220px', minWidth: '200px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
      background: FRAME.panel, padding: '10px 12px 10px'
    } as CSSStyleDeclaration);
    bevel(col);
    col.appendChild(line(c.heading, { fontSize: '12.5px', fontWeight: '700', color: FRAME.ink, marginBottom: '6px' }));
    const list = document.createElement('ul');
    Object.assign(list.style, { margin: '0 0 10px', padding: '0 0 0 14px', listStyle: 'square', flex: '1' } as CSSStyleDeclaration);
    for (const text of c.lines) {
      const li = document.createElement('li');
      li.textContent = text;
      Object.assign(li.style, { fontSize: '11.5px', lineHeight: '1.5', color: FRAME.ink, marginBottom: '3px' } as CSSStyleDeclaration);
      list.appendChild(li);
    }
    col.appendChild(list);
    const foot = document.createElement('div');
    Object.assign(foot.style, { minHeight: '30px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } as CSSStyleDeclaration);
    let btn: HTMLButtonElement | null = null;
    if (withButton) {
      btn = button(c.button);
      disable(btn, true);
      entryButtons.push(btn);
      foot.appendChild(btn);
    }
    col.appendChild(foot);
    columns.appendChild(col);
    return { col, foot, btn };
  };

  // all three, always — but on a touch screen the phone's card leads, so the
  // one that fits the hand is not below the fold (an order, never a sniff that hides)
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches === true;
  const phone = coarse ? choiceCard(copy.cards.phone, true) : null;
  const desktop = choiceCard(copy.cards.desktop, true);
  const phoneCard = phone ?? choiceCard(copy.cards.phone, true);
  const headset = choiceCard(copy.cards.headset, false);
  const headsetNote = line(copy.cards.headset.unavailable, { fontSize: '11px', color: FRAME.dim });
  headset.foot.appendChild(headsetNote);
  const phoneNote = line('', { fontSize: '11px', color: FRAME.dim, display: 'none' });
  phoneCard.foot.appendChild(phoneNote);

  inner.appendChild(line(copy.menuLine, { fontSize: '11.5px', lineHeight: '1.5', color: FRAME.dim, marginBottom: '10px' }));

  // ── the captions checkbox: the sound NAMES in the strip (W-G2), on by default ──
  const capRow = document.createElement('label');
  Object.assign(capRow.style, { display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', marginBottom: '12px' } as CSSStyleDeclaration);
  const cap = document.createElement('input');
  cap.type = 'checkbox';
  cap.checked = ledger.view.captions;
  Object.assign(cap.style, { margin: '2px 0 0', accentColor: FRAME.titleBar } as CSSStyleDeclaration);
  cap.addEventListener('change', () => { ledger.view.captions = cap.checked; });
  capRow.appendChild(cap);
  const capText = document.createElement('div');
  capText.appendChild(line(copy.captionsLabel, { fontSize: '12px', color: FRAME.ink }));
  capText.appendChild(line(copy.captionsNote, { fontSize: '11px', lineHeight: '1.5', color: FRAME.dim }));
  capRow.appendChild(capText);
  inner.appendChild(capRow);

  // ── the foot: Leave (always works), the arm-delay's wait, the note ──
  const actions = document.createElement('div');
  Object.assign(actions.style, { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingTop: '10px', borderTop: `1px solid ${FRAME.panelDark}` } as CSSStyleDeclaration);
  const leave = button(copy.leaveLabel);
  const wait = line(`(${copy.wait})`, { fontSize: '11px', color: FRAME.dim });
  const enterNote = line(copy.enterNote, { fontSize: '11px', color: FRAME.dim, display: 'none' });
  actions.appendChild(leave);
  actions.appendChild(wait);
  actions.appendChild(enterNote);
  inner.appendChild(actions);

  const arm = (): void => {
    if (destroyed) return;
    armed = true;
    for (const b of entryButtons) disable(b, false);
    wait.style.display = 'none';
    enterNote.style.display = 'block';
  };
  const armTimer = window.setTimeout(arm, ARM_DELAY_MS);

  /**
   * ⚑ S86 — FULLSCREEN ON THE DELIBERATE PRESS (Sérgio: he wants the piece to
   * start fullscreen). A browser will only grant it inside a transient user
   * activation, and it can never be asked for on load — it would simply throw.
   * The door's own entry buttons ARE that gesture, and the ONLY place in the
   * piece with one before the room appears.
   *
   * Fails soft everywhere it is not available: iOS *phone* Safari has no
   * Element.requestFullscreen at all (iPadOS does), some embeds forbid it, and
   * a user can leave it at any time. Nothing downstream may depend on it.
   * ⚑ The promise rejection must be swallowed: an unhandled rejection here
   * would surface as a console error on every phone that lacks the API, and
   * `npm run audit` counts console errors.
   */
  const goFullscreen = (): void => {
    const el = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    try {
      if (document.fullscreenElement) return;
      const req = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
      if (!req) return; // iPhone Safari: no API. Not an error, just not offered.
      const r = req();
      if (r && typeof (r as Promise<void>).catch === 'function') {
        (r as Promise<void>).catch(() => { /* denied or unsupported — play windowed */ });
      }
    } catch { /* same */ }
  };

  const enterWith = (choice: DoorChoice): void => {
    if (entered || destroyed) return;
    entered = true;
    for (const b of entryButtons) disable(b, true);
    onContinue(choice);
  };

  desktop.btn!.addEventListener('click', () => {
    if (!armed || destroyed) return;
    goFullscreen(); // must happen INSIDE the click stack, before any await
    enterWith('desktop');
  });

  /**
   * ⚑ F-01 — THE PHONE CARD IS THE GESTURE. iOS grants orientation only from a
   * real press over HTTPS, so choosing "turn the device" asks the device right
   * here, in this click stack, and the answer goes into the ledger (in memory,
   * never stored) for the engine to act on when it starts
   * (src/engine/app.ts: granted → the listener attaches with no second press;
   * denied → the room says so and drag-to-look stands). Android and every other
   * browser have no prompt: the choice alone is the grant. Either way the room
   * opens — a declined sensor is not a locked door.
   */
  phoneCard.btn!.addEventListener('click', () => {
    if (!armed || destroyed || entered) return;
    goFullscreen();
    type Requestable = { requestPermission?: () => Promise<PermissionState | string> };
    const req = (window.DeviceOrientationEvent as unknown as Requestable | undefined)?.requestPermission;
    if (typeof req !== 'function') {
      ledger.view.motion = 'granted';
      enterWith('phone');
      return;
    }
    phoneNote.textContent = copy.cards.phone.asking;
    phoneNote.style.display = 'block';
    for (const b of entryButtons) disable(b, true);
    req.call(window.DeviceOrientationEvent)
      .then((res: string) => { ledger.view.motion = res === 'granted' ? 'granted' : 'denied'; })
      .catch(() => { ledger.view.motion = 'denied'; })
      .then(() => {
        if (destroyed) return;
        if (ledger.view.motion === 'denied') phoneNote.textContent = copy.cards.phone.denied;
        enterWith('phone');
      });
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
    inner.replaceChildren(
      line(copy.leftTitle, { fontSize: '15px', fontWeight: '700', color: FRAME.ink, marginBottom: '8px' }),
      line(copy.leftBody, { fontSize: '12px', lineHeight: '1.6', color: FRAME.ink })
    );
  };
  leave.addEventListener('click', doLeave);

  document.body.appendChild(root);

  // `?flat=1` is the canvas-only review tool: do not even probe or
  // prepare WebXR there. On every other path, unsupported browsers keep the
  // headset card as a listed way in that this browser cannot offer.
  if (new URLSearchParams(window.location.search).get('flat') !== '1' && navigator.xr) {
    void navigator.xr.isSessionSupported('immersive-vr').then(async (supported) => {
      if (!supported || destroyed) return;
      const canvas = document.getElementById('app');
      if (!(canvas instanceof HTMLCanvasElement)) return;
      const ready = await prepareImmersiveVrEntry(canvas);
      if (!ready || destroyed || !headset.foot.isConnected) return;
      const enterVr = button(copy.cards.headset.button);
      disable(enterVr, !armed);
      entryButtons.push(enterVr);
      enterVr.addEventListener('click', () => {
        if (!armed || destroyed) return;
        // startApp consumes this flag synchronously inside onContinue's click
        // stack, before model preloading can yield and lose user activation.
        requestImmersiveVrEntry();
        enterWith('headset');
      });
      headsetNote.remove();
      headset.foot.appendChild(enterVr);
    }).catch(() => {
      // Availability failure is the unsupported path: the card stays as it is.
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

/**
 * ⚑ THE INTERIM MARK — a CRT with a lit screen, drawn in the ERA1 palette.
 * R3-01 asks for the logo at the top and the file is his (an ASK); until it
 * arrives this stands in its place, and it is replaced here, in one function,
 * not around the panel. SVG, inline, no fetch.
 */
function drawMark(size: number): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 16 14');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(Math.round(size * 14 / 16)));
  svg.setAttribute('aria-hidden', 'true');
  svg.style.flex = 'none';
  svg.style.imageRendering = 'pixelated';
  const rect = (x: number, y: number, w: number, h: number, fill: string): void => {
    const r = document.createElementNS(ns, 'rect');
    r.setAttribute('x', String(x)); r.setAttribute('y', String(y));
    r.setAttribute('width', String(w)); r.setAttribute('height', String(h));
    r.setAttribute('fill', fill);
    svg.appendChild(r);
  };
  rect(0, 0, 16, 11, FRAME.panelDarker);     // the case
  rect(1, 1, 14, 9, FRAME.panel);            // the bezel
  rect(2, 2, 12, 7, FRAME.screenDark);       // the glass, dark
  rect(3, 3, 10, 5, FRAME.screen);           // the picture
  rect(4, 4, 1, 1, FRAME.panelLight);        // the prompt
  rect(6, 11, 4, 1, FRAME.panelDarker);      // the neck
  rect(4, 12, 8, 2, FRAME.panelDark);        // the foot
  return svg;
}
