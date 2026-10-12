/**
 * ⚑ S227 — LAMBYOS HOME, first pass: the programme's front door, the way Bob was Windows'
 * (docs/reinterp/LAMBYOS_HOME_DESIGN_2026-10-09.md, his answers in §7).
 *
 * WHAT IT IS. An illustrated 1997 living room (S231: GPT's round-4 layers as <img>s under real <button>s, placed by
 * homeArt.ts from its layout.json; before S231 it was a pixel-art canvas drawn in code), mounted where the
 * orienting card used to be mounted (src/main.ts): before the engine starts, beside the game menu, so Esc and the
 * corner glyph work from its first frame. Each object teaches one thing and opens one plain card in the FRAME's
 * voice (functional, undecorated; the orienting card's own words, from orientingCard.json, unchanged). The room
 * and Lamby's bubbles are the PROGRAMME's (register operable): they may charm; they never carry a frame word.
 *
 * ⚑ S237 — THE WINDOW (his 2026-10-12: "I don't understand why it lost the overall layout of the old windows 95 on the
 * menus"). The room sits inside a Windows-95 application window again, as in his style reference and GPT's design: a
 * navy title bar across the top (the mark, the piece's title | PC Simulator, the _ □ X boxes: the first two inert, the
 * X is the door's Leave) and a grey bar along the bottom (Sound captions, Controls, Credits, Leave, Music, and "Esc
 * opens the menu."). The room is laid out in the window's client area between them. All DOM, the piece's own chrome
 * (theme/chrome.ts DIALOG + domBevel, the orienting card's mark), words in data/strings/home.json `window`. The global
 * pause button is hidden while Home is up (the bottom bar gives the menu; on a phone it has a Menu button).
 *
 * THE ONE GATE (design §1). The notice is the only thing lit at the start. Closing its card starts the existing
 * 4 s arm-delay ("enter can never be instant", orientingCard.ts ARM_DELAY_MS); then the three enter buttons light.
 * Until then they are drawn dead (R3-26: shown to be dead, not hidden). Nothing else is gated, nothing is ticked:
 * an opened object looks exactly like an unopened one, there is no count and no fanfare (the frame never plays).
 *
 * THE HANDOVER (design §3). Each device's enter button does exactly what the orienting card's did: the same
 * `onContinue(choice)` from src/main.ts, the fullscreen request inside the click stack, the iOS orientation
 * request on the phone's press, `requestImmersiveVrEntry()` on the headset's. Before it, `chooseCut()` records the
 * one quiet choice (the full piece / the Speedrun Version — his 2026-10-10 "both"), in memory only.
 *
 * HOME RECORDS NOTHING (his "Record? no"). No witness entry, no ledger record. The only things that carry over are
 * the two view settings the old door already carried (`ledger.view.captions`, `ledger.view.motion`) and the cut.
 *
 * LAMBY speaks only in bubbles (his "only speech bubbles like BOB"): short, dismissible, hidden whenever a card is
 * open (so never over the content note), and never on a timer — a bubble appears on arrival and on a press.
 *
 * THE RETURNING VISITOR (design §3). Nothing can be stored, so the piece cannot know one. Two ways past: the short
 * door (the notice's last line → the orienting card, content note intact), and a Restart in the same tab, which
 * reloads with `#home-armed` (gameMenu.ts) — Home then starts the 4 s arm at once, because the notice was read
 * minutes ago in this tab, and strips the marker so a later reload is a fresh visit. `?home=0` skips Home for the
 * short door (installations, the festival cut).
 */
import type { HomeXr } from './homeXr';
import copy from '../../../data/strings/home.json';
import door from '../../../data/strings/orientingCard.json';
import menuCopy from '../../../data/strings/gameMenu.json';
import { prepareImmersiveVrEntry, requestImmersiveVrEntry, preparedHomeShell, enterImmersiveHome } from '../../engine/entry';
import { ledger, wipeLedger } from '../../state/ledger';
import { gameMenuBus } from '../../state/gameMenuBus';
import { chooseCut, currentCut, type Cut } from '../../state/cut';
import { DIALOG, domBevel } from '../theme/chrome';
import { ERA1, ERA1_CANVAS, RENDER_SCALE } from '../theme/era1';
import { HOME } from '../theme/home';
import { mountOrientingCard, drawMark, type DoorChoice } from '../orientingCard';
import { Lexicon, LEXICON_SOURCES } from '../../room/lexicon';
import { mountLeavePage, type LeavePage } from '../../frame/leavePage';
import lex from '../../../data/strings/lexicon.json';
import { playLoop, stopClip } from '../../audio/tapeAudio';
import {
  DECOR, HAND_PIVOT, TAB_ORDER, ROOM, bubbleRect, handRect, hitRect, layerSize, layerUrl, modeFor, padlockAnchor, useLarge, visualRect,
  type HomeObject, type Mode, type Rect
} from './homeArt';

const ARM_DELAY_MS = 4000; // the same ethics arm-delay as the orienting card
const LEXICON_SAY_MS = 1900; // S233: how long Lamby's line stands before the Lexicon opens (reading time; not a motion, so reduced motion keeps it)
const MIN_TARGET_CSS = 44; // design §4: every object's hit area, whatever the art's size
declare const __APP_VERSION__: string;
const VERSION_TAG = door.versionTag.replace('{v}', typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0');

export interface LambyosHome { destroy(): void }

/**
 * ⚑ S230 — THE ROOM HAS TWO MODES, and only the logic differs (the art is the same):
 *   'arrival' — the front door, before the fiction (everything above).
 *   'return'  — the Close brings the visitor back (design §7 item 3, his idea: the piece opens in the showroom and
 *               closes in it). The same room, but: the Lexicon on the shelf is lit and opens the Lexicon (the Close's
 *               own UI and data, Your Words read from this visit's memory, with its sources); the three devices
 *               offer START AGAIN instead of Enter (the wipe and the reload the menu's Restart does); the door is
 *               Leave; nothing is gated (nobody is being admitted); Lamby's bubbles are end-of-visit lines. It
 *               never calls `onContinue`, and it files nothing, exactly as arrival.
 */
export type HomeMode = 'arrival' | 'return';
export interface HomeOptions { mode?: HomeMode }

const reducedMotion = (): boolean => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

export function mountLambyosHome(onContinue: (choice: DoorChoice) => void, opts: HomeOptions = {}): LambyosHome {
  const isReturn = opts.mode === 'return';
  let destroyed = false;
  let entered = false;
  let armed = isReturn;   // a return admits nobody: there is nothing to arm
  let armTimer = 0;
  let arming = false;
  let cut: Cut = currentCut();
  let vrReady = false;
  let immersive = false;
  let xrFace: HomeXr | null = null;
  let shortDoor: { destroy(): void } | null = null;
  let leavePage: LeavePage | null = null;   // S233: the return door's Leave opens the in-between page (src/frame/leavePage.ts)
  let lexiconSaid = false;                  // S233: Lamby's "saved for later" bubble comes once, just before the Lexicon first opens
  let lexiconTimer = 0;
  let capBox: HTMLInputElement | null = null;     // S237: the bottom bar's Sound captions box (kept in step with the remote's card)
  let musicBox: HTMLInputElement | null = null;   // S237: the bottom bar's Music box (reflects whether the loop is playing)

  // ── a Restart in this tab: the notice was read minutes ago (design §3, way 2) ──
  const returning = !isReturn && window.location.hash === '#home-armed';
  if (returning) {
    try { window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search); } catch { /* keep the hash */ }
  }

  // ── the root: a fixed layer under the game menu (1000), as the orienting card was (900) ──
  const root = document.createElement('div');
  root.id = 'lambyos-home';
  root.setAttribute('role', 'main');
  root.setAttribute('aria-label', isReturn ? copy.return.roomLabel : copy.roomLabel);
  root.dataset.mode = isReturn ? 'return' : 'arrival';   // the audit's handle (tools/walk.mjs stops at a return)
  Object.assign(root.style, {
    position: 'fixed', inset: '0', zIndex: '900', overflow: 'hidden',
    background: DIALOG.panel, font: DIALOG.font, color: DIALOG.ink,
    transition: 'opacity 0.7s'
  } as CSSStyleDeclaration);
  if (isReturn) { root.style.opacity = '0'; root.style.transition = 'opacity 2.2s'; }   // the Close gives way to the room slowly

  // ── S237: the Windows-95 window — title bar, client area (the room), bottom bar (filled by fillBars, below) ──
  const win = document.createElement('div');
  win.dataset.homeWindow = '1';
  Object.assign(win.style, { position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', background: DIALOG.panel } as CSSStyleDeclaration);
  domBevel(win);
  root.appendChild(win);
  const titleBar = document.createElement('div');
  titleBar.className = 'hw-title';
  Object.assign(titleBar.style, {
    display: 'flex', alignItems: 'center', gap: '8px', flex: 'none', boxSizing: 'border-box',
    background: DIALOG.titleBar, color: DIALOG.titleInk, padding: '0 3px 0 8px', fontWeight: '700', fontSize: '13px'
  } as CSSStyleDeclaration);
  win.appendChild(titleBar);
  const client = document.createElement('div');   // the window's client area: the room is laid out in here
  client.className = 'hw-client';
  Object.assign(client.style, { position: 'relative', flex: '1 1 0', minHeight: '0', overflow: 'hidden', background: HOME.ink } as CSSStyleDeclaration);
  win.appendChild(client);
  const statusBar = document.createElement('div');
  statusBar.className = 'hw-bar';
  Object.assign(statusBar.style, {
    display: 'flex', alignItems: 'center', gap: '8px', flex: 'none', boxSizing: 'border-box', background: DIALOG.panel,
    borderTop: `2px solid ${DIALOG.light}`, padding: '3px 8px'
  } as CSSStyleDeclaration);
  win.appendChild(statusBar);

  const stage = document.createElement('div');
  Object.assign(stage.style, { position: 'absolute', zIndex: '0' } as CSSStyleDeclaration);   // its own stacking context: the cards (veil) sit above every layer
  client.appendChild(stage);

  // ── the art: GPT's round-4 layers (homeArt.ts says where each sits and which file it is) ──
  const noSelect = { userSelect: 'none', pointerEvents: 'none', position: 'absolute', imageRendering: 'auto' } as CSSStyleDeclaration;
  /** an <img> that changes its file only when the file changes (a resize that keeps the size set re-downloads nothing) */
  const setSrc = (i: HTMLImageElement, url: string): void => { if (i.dataset.url !== url) { i.dataset.url = url; i.src = url; } };
  const newImg = (): HTMLImageElement => {
    const i = new Image();
    i.alt = ''; i.decoding = 'async'; i.draggable = false;
    i.setAttribute('aria-hidden', 'true');
    Object.assign(i.style, noSelect);
    return i;
  };
  /** a layer centred on its visual rectangle at its natural size (GPT's own placement: the wave pose is a few units
   *  taller than the point pose, and sits on the same centre) */
  const placeImg = (i: HTMLImageElement, name: string, vis: Rect, origin: Rect): void => {
    const nat = layerSize(name, mode);
    const w = nat.w * scale, h = nat.h * scale;
    Object.assign(i.style, {
      left: `${(vis.x + vis.w / 2 - origin.x) * scale - w / 2}px`, top: `${(vis.y + vis.h / 2 - origin.y) * scale - h / 2}px`,
      width: `${w}px`, height: `${h}px`
    } as CSSStyleDeclaration);
    setSrc(i, layerUrl(name, mode, large));
  };

  const roomImg = newImg();
  Object.assign(roomImg.style, { left: '0', top: '0', width: '100%', height: '100%' } as CSSStyleDeclaration);
  stage.appendChild(roomImg);
  const decor = DECOR.map((name) => { const i = newImg(); stage.appendChild(i); return { name, i }; });

  // ── the objects: real buttons over the art, in GPT's tab order (the Lexicon after the plaque) ──
  const focusCss = document.createElement('style');
  focusCss.textContent =
    `#lambyos-home [data-home]{background:transparent;border:0;padding:0;margin:0;cursor:pointer;position:absolute;border-radius:0;z-index:2;-webkit-tap-highlight-color:transparent;touch-action:manipulation}` +
    `#lambyos-home [data-home="door"]{z-index:1}#lambyos-home [data-home="lamby"]{z-index:3}#lambyos-home [data-home="armchair"]{z-index:4}` +
    `#lambyos-home [data-home][aria-disabled="true"]{cursor:default}` +
    `#lambyos-home [data-home]:focus-visible{outline:2px dashed ${HOME.accent};outline-offset:-2px}` +
    `#lambyos-home [data-home]:hover:not([aria-disabled="true"]) img{filter:drop-shadow(1px 0 ${HOME.accent});animation:lh-wiggle 1.2s ease-in-out infinite}` +
    `#lambyos-home [data-home="lexicon"][data-state="dead"] img{filter:grayscale(.75) brightness(.9)}` +
    `#lambyos-home [data-home="lexicon"][data-state="lit"] img{filter:drop-shadow(0 0 6px ${HOME.accent});animation:lh-glow 2.4s ease-in-out infinite}` +
    `#lambyos-home [data-home="notice"][data-pulse] img{outline:2px solid ${HOME.accent};animation:lh-pulse 2s ease-in-out infinite}` +
    `@keyframes lh-wiggle{25%{translate:-1px -1px}75%{translate:1px -1px}}` +
    `@keyframes lh-pulse{50%{box-shadow:0 0 0 3px ${HOME.accent};filter:brightness(1.08)}}` +
    `@keyframes lh-glow{50%{filter:drop-shadow(0 0 12px ${HOME.accent})}}` +
    `#lambyos-home .home-btn{font:inherit;font-size:13px;min-height:44px;padding:8px 16px;background:${DIALOG.panel};color:${DIALOG.ink};border-radius:0;cursor:pointer}` +
    `#lambyos-home .home-btn:disabled{color:${DIALOG.faint};cursor:not-allowed}` +
    `#lambyos-home .home-btn:focus-visible{outline:2px dotted ${DIALOG.ink};outline-offset:-6px}` +
    // S237 — the window's bars. The global pause button is hidden while Home is up (the bar gives the menu).
    `body:has(#lambyos-home) #reinterp-menu-glyph{display:none!important}` +
    `#lambyos-home .hw-title{min-height:30px}` +
    `#lambyos-home .hw-box{width:22px;height:20px;flex:none;font:inherit}` +
    `#lambyos-home .hw-x{margin-left:2px}` +
    `#lambyos-home .hw-bar .home-btn{min-height:34px;padding:4px 14px;font-size:13px}` +
    `#lambyos-home .hw-chk{display:flex;align-items:center;gap:6px;min-height:34px;cursor:pointer;white-space:nowrap;font-size:13px}` +
    `#lambyos-home .hw-chk input{width:16px;height:16px;margin:0;accent-color:${DIALOG.titleBar}}` +
    `#lambyos-home .hw-chk:focus-within,#lambyos-home .hw-x:focus-visible{outline:2px dotted ${DIALOG.ink};outline-offset:-3px}` +
    `#lambyos-home .hw-esc{margin-left:14px;font-size:12px;color:${DIALOG.dim};white-space:nowrap}` +
    `#lambyos-home .hw-menu{display:none}` +
    `@media (max-width:760px),(pointer:coarse){#lambyos-home .hw-title{min-height:44px}#lambyos-home .hw-x{width:44px;height:36px}` +
    `#lambyos-home .hw-bar .home-btn,#lambyos-home .hw-chk{min-height:44px}#lambyos-home .hw-chk input{width:20px;height:20px}}` +
    `@media (max-width:760px){#lambyos-home .hw-inert,#lambyos-home .hw-controls,#lambyos-home .hw-credits,#lambyos-home .hw-esc{display:none!important}` +
    `#lambyos-home .hw-menu{display:inline-block}#lambyos-home .hw-bar{padding:3px 6px;gap:6px}#lambyos-home .hw-bar .home-btn{padding:4px 10px}}` +
    `@media (prefers-reduced-motion: reduce){#lambyos-home{transition:none!important}#lambyos-home *{animation:none!important}}`;
  root.appendChild(focusCss);

  /** what each button holds: its pictures (each centred on a rectangle of the layout) */
  interface Held { img: HTMLImageElement; name: () => string; vis: () => Rect }
  const held = {} as Record<HomeObject, Held[]>;
  const buttons = {} as Record<HomeObject, HTMLButtonElement>;
  const HAS_PICTURE: Partial<Record<HomeObject, () => string>> = {
    door: () => 'door', notice: () => 'notice', plaque: () => 'plaque', lexicon: () => 'lexicon', remote: () => 'remote', switch: () => 'switch',
    computer: () => 'computer', tablet: () => 'tablet', headset: () => 'headset', clock: () => 'clock', calendar: () => 'calendar',
    lamby: () => (armed ? 'lamby-wave' : 'lamby')   // pointing at the notice until the gate opens, then waving (round4 pose())
  };
  const handImgs = {} as Record<'hour' | 'minute', HTMLImageElement>;
  const monthLabel = document.createElement('span');
  Object.assign(monthLabel.style, {
    position: 'absolute', textAlign: 'center', font: 'bold 15px/1 monospace', color: HOME.ink, pointerEvents: 'none', transform: 'translateY(-50%)'
  } as CSSStyleDeclaration);
  for (const k of TAB_ORDER) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.home = k;
    b.setAttribute('aria-label', copy.objects[k]);
    if (k === 'lexicon') {   // S230: on the shelf from the first frame, drawn dead until the Close brings the visitor back
      b.dataset.state = isReturn ? 'lit' : 'dead';
      if (!isReturn) { b.setAttribute('aria-disabled', 'true'); b.setAttribute('aria-label', copy.objects.lexiconLater); }
    }
    if (k === 'notice' && !isReturn) b.dataset.pulse = '1';   // the marigold pulse: the one thing they want you to read
    b.addEventListener('click', () => press(k));
    buttons[k] = b;
    held[k] = [];
    const name = HAS_PICTURE[k];
    if (name) {
      const img = newImg();
      if (k === 'lamby') img.style.transform = 'scaleX(-1)';   // GPT's art faces right; Lamby faces the notice
      b.appendChild(img);
      held[k].push({ img, name, vis: () => visualRect(k, mode)! });
    }
    if (k === 'clock') {
      for (const which of ['hour', 'minute'] as const) {
        const img = newImg();
        img.style.transformOrigin = `${HAND_PIVOT[0] * 100}% ${HAND_PIVOT[1] * 100}%`;
        handImgs[which] = img;
        b.appendChild(img);
        held[k].push({ img, name: () => `clock-${which}-hand`, vis: () => handRect(which, mode) });
      }
    }
    if (k === 'calendar') b.appendChild(monthLabel);
    stage.appendChild(b);
  }

  // ── the visible labels: only the notice and the three devices, DOM text ≥ 15 px whatever the art's size ──
  const makeLabel = (k: 'notice' | 'computer' | 'tablet' | 'headset'): HTMLSpanElement => {
    const s = document.createElement('span');
    s.setAttribute('aria-hidden', 'true');
    Object.assign(s.style, {
      position: 'absolute', zIndex: '5', background: DIALOG.panel, color: DIALOG.ink, font: '700 15px/1.12 Arial, sans-serif',
      padding: '3px 5px', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none'
    } as CSSStyleDeclaration);
    domBevel(s, false, 1);
    s.addEventListener('click', () => buttons[k].click());
    stage.appendChild(s);
    return s;
  };
  const labels = { notice: makeLabel('notice'), computer: makeLabel('computer'), tablet: makeLabel('tablet'), headset: makeLabel('headset') };

  // ── the padlocks: on the three devices until the gate opens (full colour: the devices themselves never darken) ──
  const locks = {} as Record<'computer' | 'tablet' | 'headset', SVGSVGElement>;
  for (const k of ['computer', 'tablet', 'headset'] as const) {
    const NS = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 9 11');
    s.setAttribute('aria-hidden', 'true');
    Object.assign(s.style, { position: 'absolute', zIndex: '6', width: '20px', height: '24px', pointerEvents: 'none', filter: `drop-shadow(0 1px 1px ${HOME.ink})` } as CSSStyleDeclaration);
    const path = (d: string, attrs: Record<string, string>): void => {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      for (const [a, v] of Object.entries(attrs)) p.setAttribute(a, v);
      s.appendChild(p);
    };
    path('M2 5V2H3V1H6V2H7V5H6V2H3V5', { fill: HOME.paper });
    path('M1 5H8V10H1Z', { fill: HOME.accent, stroke: HOME.ink });
    path('M4 7H5V9H4Z', { fill: HOME.ink });
    locks[k] = s;
    stage.appendChild(s);
  }

  // ── Lamby's bubble: the programme's voice, on GPT's speech-bubble layer (its tail faces right, toward Lamby) ──
  const bubble = document.createElement('div');
  bubble.setAttribute('role', 'status');
  bubble.setAttribute('aria-live', 'polite');
  Object.assign(bubble.style, {
    position: 'absolute', display: 'none', boxSizing: 'border-box', zIndex: '8', isolation: 'isolate', width: 'max-content',
    minHeight: '54px', padding: '8px 49px 14px 14px', color: ERA1.black, font: '700 15px/1.2 Arial, sans-serif'
  } as CSSStyleDeclaration);
  const bubbleImg = newImg();
  Object.assign(bubbleImg.style, { left: '0', top: '0', width: '100%', height: '100%', zIndex: '-1', transform: 'scaleX(-1)' } as CSSStyleDeclaration);
  bubble.appendChild(bubbleImg);
  const bubbleText = document.createElement('div');
  bubble.appendChild(bubbleText);
  const bubbleX = document.createElement('button');
  bubbleX.type = 'button';
  bubbleX.textContent = '×';
  bubbleX.setAttribute('aria-label', copy.lamby.dismiss);
  Object.assign(bubbleX.style, {
    position: 'absolute', right: '0', top: '0', width: '44px', height: '44px', background: 'transparent',
    border: '0', font: 'inherit', fontSize: '18px', color: ERA1.black, cursor: 'pointer'
  } as CSSStyleDeclaration);
  bubbleX.addEventListener('click', () => hideBubble());
  bubble.appendChild(bubbleX);
  stage.appendChild(bubble);

  // ── the frame's cards ──
  const veil = document.createElement('div');
  Object.assign(veil.style, {
    position: 'absolute', inset: '0', display: 'none', alignItems: 'center', justifyContent: 'center',
    background: `rgba(${DIALOG.veilRGB}, 0.5)`, padding: '16px', boxSizing: 'border-box', overflowY: 'auto'
  } as CSSStyleDeclaration);
  try { veil.style.backdropFilter = 'blur(3px)'; veil.style.setProperty('-webkit-backdrop-filter', 'blur(3px)'); } catch { /* no blur: the veil alone */ }
  client.appendChild(veil);   // a card covers the room, not the window: the title bar and the bottom bar stay

  let mode: Mode = 'laptop';
  let scale = 1;
  let large = false;
  let noticeSeen = false;   // the pulse stops the first time the notice is pressed
  let clockQuarter = 0;     // the toys: hands turn in 90° steps, the calendar turns months (round4 clock() / calendar())
  let month = 9;            // OCT, where GPT's calendar starts

  // ── drawing ──
  /** the button's rectangle in room units: the layout's, grown to MIN_TARGET_CSS on a small screen */
  const grown = (r: Rect): Rect => {
    const m = MIN_TARGET_CSS / scale;
    const out = { ...r };
    if (out.w < m) { out.x -= (m - out.w) / 2; out.w = m; }
    if (out.h < m) { out.y -= (m - out.h) / 2; out.h = m; }
    return out;
  };
  const px = (el: HTMLElement | SVGElement, r: { l: number; t: number; w?: number; h?: number }): void => {
    el.style.left = `${r.l}px`; el.style.top = `${r.t}px`;
    if (r.w !== undefined) el.style.width = `${r.w}px`;
    if (r.h !== undefined) el.style.height = `${r.h}px`;
  };

  function turnToys(): void {
    handImgs.hour.style.transform = `rotate(${clockQuarter * 90}deg)`;
    handImgs.minute.style.transform = `rotate(${((clockQuarter + 1) % 4) * 90}deg)`;
    monthLabel.textContent = copy.calendar.months[month];
    buttons.calendar.setAttribute('aria-label', `${copy.objects.calendar} (${copy.calendar.months[month]})`);
  }

  /** what changes with the gate: Lamby's pose, the padlocks (arrival only, until armed), the Lexicon's light */
  function refreshState(): void {
    placeButton('lamby');
    for (const k of ['computer', 'tablet', 'headset'] as const) locks[k].style.display = !isReturn && !armed ? 'block' : 'none';
    buttons.lexicon.dataset.state = isReturn ? 'lit' : 'dead';
    if (noticeSeen) delete buttons.notice.dataset.pulse;
  }

  function placeButton(k: HomeObject): void {
    const base = hitRect(k, mode);
    const r = grown(base);
    px(buttons[k], { l: r.x * scale, t: r.y * scale, w: r.w * scale, h: r.h * scale });
    for (const h of held[k]) placeImg(h.img, h.name(), h.vis(), r);
    if (k === 'calendar') {
      const v = visualRect('calendar', mode)!;
      px(monthLabel, { l: (v.x - r.x) * scale, t: (v.y + v.h * 0.58 - r.y) * scale, w: v.w * scale });
    }
  }

  function layoutAll(): void {
    // S237: the room is laid out in the window's client area (between the two bars), not the whole viewport
    const vw = client.clientWidth || window.innerWidth, vh = client.clientHeight || window.innerHeight;
    mode = modeFor(vw, vh);
    const R = ROOM[mode];
    // contain on a laptop; fill the width on a phone (and contain where a tall tablet is too short for that)
    scale = Math.min(vw / R.w, vh / R.h);
    large = useLarge(scale, window.devicePixelRatio || 1);
    const sw = R.w * scale, sh = R.h * scale;
    Object.assign(stage.style, {
      width: `${sw}px`, height: `${sh}px`,
      left: `${Math.round((vw - sw) / 2)}px`, top: `${Math.round((vh - sh) / 2)}px`
    } as CSSStyleDeclaration);
    setSrc(roomImg, layerUrl('room', mode, large));
    for (const d of decor) placeImg(d.i, d.name, visualRect(d.name, mode)!, { x: 0, y: 0, w: R.w, h: R.h });
    for (const k of TAB_ORDER) placeButton(k);
    setSrc(bubbleImg, layerUrl('speech-bubble', mode, large));
    // the labels: the notice's sits on its lower edge; a device's hangs just below its rectangle, centred (phone: the short words)
    for (const k of ['notice', 'computer', 'tablet', 'headset'] as const) {
      const lab = labels[k];
      lab.textContent = k === 'notice' ? copy.labels.notice : mode === 'phone' ? copy.labels.phone[k] : copy.labels[k];
      const r = hitRect(k, mode);
      const cx = (r.x + r.w / 2) * scale;
      lab.style.left = `${Math.max(2, Math.min(sw - lab.offsetWidth - 2, cx - lab.offsetWidth / 2))}px`;
      lab.style.top = `${k === 'notice' ? (r.y + r.h) * scale - lab.offsetHeight : (r.y + r.h) * scale + 4}px`;
    }
    for (const k of ['computer', 'tablet', 'headset'] as const) {
      const v = visualRect(k, mode)!, [ax, ay] = padlockAnchor(k);
      px(locks[k], { l: (v.x + v.w * ax) * scale - 10, t: (v.y + v.h * ay) * scale });
    }
    turnToys();
    refreshState();
    if (bubble.style.display !== 'none') positionBubble();
  }

  /** GPT's rule: the bubble's RIGHT edge and top stay at the layout's anchor; it is as wide as its line needs, up to
   *  the layout's width (a little more on a phone, where that width is only 185 px) and never off the stage */
  function positionBubble(): void {
    const b = bubbleRect(mode);
    const right = (b.x + b.w) * scale;
    const maxW = Math.min(right - 4, Math.max(b.w * scale, mode === 'phone' ? 230 : 0));
    bubble.style.maxWidth = `${maxW}px`;
    bubble.style.left = '0px';
    bubble.style.top = `${b.y * scale}px`;
    // the layer's tail takes the lower third of its picture: room for it grows with the text (round4's rule)
    bubble.style.paddingBottom = `${Math.max(14, Math.ceil((bubbleText.offsetHeight + 12) * 0.35))}px`;
    bubble.style.left = `${Math.max(4, right - bubble.offsetWidth)}px`;
  }
  let chatter = 0;
  function say(text: string): void {
    if (destroyed || cardOpen) return; // never over a card, and so never over the content note
    bubbleText.textContent = text;
    bubble.style.display = 'block';
    positionBubble();
  }
  function hideBubble(): void { bubble.style.display = 'none'; }

  // ── cards ──
  let cardOpen: HomeObject | null = null;
  let cardBody: HTMLDivElement | null = null;
  let onCardClosed: (() => void) | null = null;
  const enterButtons = new Set<HTMLButtonElement>();
  const waitNotes = new Set<HTMLElement>();
  const enterNotes = new Set<HTMLElement>();

  const el = (tag: string, text: string, style: Partial<CSSStyleDeclaration> = {}): HTMLElement => {
    const e = document.createElement(tag);
    e.textContent = text;
    Object.assign(e.style, style as CSSStyleDeclaration);
    return e;
  };
  const para = (text: string, extra: Partial<CSSStyleDeclaration> = {}): HTMLElement =>
    el('div', text, { fontSize: '13px', lineHeight: '1.55', margin: '0 0 10px', ...extra });
  const btn = (label: string, onClick: () => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'home-btn';
    b.textContent = label;
    domBevel(b);
    b.addEventListener('click', onClick);
    return b;
  };

  function openCard(k: HomeObject, title: string, build: (body: HTMLDivElement) => void, closed?: () => void, wide = false): void {
    if (destroyed) return;
    closeCard(true);
    hideBubble();
    cardOpen = k;
    onCardClosed = closed ?? null;
    const dlg = document.createElement('div');
    dlg.setAttribute('role', 'dialog');
    dlg.setAttribute('aria-modal', 'true');
    dlg.setAttribute('aria-label', title);
    Object.assign(dlg.style, {
      width: wide ? 'min(580px, 100%)' : 'min(480px, 100%)', maxHeight: '100%', display: 'flex', flexDirection: 'column',
      boxSizing: 'border-box', background: DIALOG.panel, margin: 'auto'
    } as CSSStyleDeclaration);
    domBevel(dlg);
    dlg.appendChild(el('div', title, {
      background: DIALOG.titleBar, color: DIALOG.titleInk, padding: '5px 8px', margin: '2px',
      fontWeight: '700', fontSize: '13px', flex: 'none'
    }));
    const body = document.createElement('div');
    Object.assign(body.style, { padding: '14px 18px 16px', overflowY: 'auto', flex: '1 1 auto' } as CSSStyleDeclaration);
    dlg.appendChild(body);
    cardBody = body;
    build(body);
    const foot = document.createElement('div');
    Object.assign(foot.style, { display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '6px' } as CSSStyleDeclaration);
    const close = btn(copy.close, () => closeCard());
    close.dataset.homeClose = '1';
    foot.appendChild(close);
    body.appendChild(foot);
    veil.replaceChildren(dlg);
    veil.style.display = 'flex';
    // focus: onto the card itself, so it is read from its title down; Tab stays inside it until it closes
    dlg.tabIndex = -1;
    dlg.style.outline = 'none';
    dlg.focus();
  }

  function closeCard(silent = false): void {
    if (!cardOpen) return;
    const k = cardOpen;
    cardOpen = null;
    cardBody = null;
    enterButtons.clear(); waitNotes.clear(); enterNotes.clear();
    veil.style.display = 'none';
    veil.replaceChildren();
    const after = onCardClosed;
    onCardClosed = null;
    if (!silent) {
      buttons[k]?.focus();
      after?.();
    }
  }

  veil.addEventListener('click', (e) => { if (e.target === veil) closeCard(); });
  veil.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !cardOpen) return;
    const f = [...veil.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href]')];
    if (f.length === 0) return;
    const i = f.indexOf(document.activeElement as HTMLElement);
    if (e.shiftKey && i <= 0) { f[f.length - 1].focus(); e.preventDefault(); }
    else if (!e.shiftKey && i === f.length - 1) { f[0].focus(); e.preventDefault(); }
  });

  // ── the gate ──
  function arm(): void {
    if (destroyed || armed) return;
    armed = true;
    for (const b of enterButtons) b.disabled = false;
    for (const w of waitNotes) w.style.display = 'none';
    for (const n of enterNotes) n.style.display = 'block';
    refreshState();   // the padlocks go, Lamby waves
  }
  function startArming(): void {
    if (arming || armed) return;
    arming = true;
    armTimer = window.setTimeout(arm, ARM_DELAY_MS);
    for (const w of waitNotes) w.style.display = 'block';
  }

  // ── the handover: exactly the orienting card's ──
  const goFullscreen = (): void => {
    const d = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
    try {
      if (document.fullscreenElement) return;
      const req = d.requestFullscreen?.bind(d) ?? d.webkitRequestFullscreen?.bind(d);
      if (!req) return;
      const p = req();
      if (p && typeof (p as Promise<void>).catch === 'function') (p as Promise<void>).catch(() => { /* play windowed */ });
    } catch { /* same */ }
  };
  const enterWith = (choice: DoorChoice): void => {
    if (entered || destroyed) return;
    entered = true;
    for (const b of enterButtons) b.disabled = true;
    chooseCut(cut);
    for (const input of root.querySelectorAll<HTMLInputElement>('input')) input.disabled = true;
    if (cardBody) cardBody.appendChild(para(copy.xr.loading));
    xrFace?.invalidate();
    onContinue(choice);
  };

  // ── the device cards: controls, the one quiet choice of cut, the way in ──
  function cutChoice(body: HTMLDivElement): void {
    const fs = document.createElement('fieldset');
    Object.assign(fs.style, { border: `1px solid ${DIALOG.dark}`, margin: '0 0 12px', padding: '4px 10px 6px' } as CSSStyleDeclaration);
    fs.appendChild(el('legend', copy.cut.legend, { fontSize: '12px', padding: '0 4px', color: DIALOG.dim }));
    for (const c of ['full', 'speedrun'] as Cut[]) {
      const lab = document.createElement('label');
      Object.assign(lab.style, { display: 'flex', alignItems: 'center', gap: '8px', minHeight: '40px', cursor: 'pointer', fontSize: '13px' } as CSSStyleDeclaration);
      const rb = document.createElement('input');
      rb.type = 'radio';
      rb.name = 'home-cut';
      rb.value = c;
      rb.checked = cut === c;
      Object.assign(rb.style, { width: '18px', height: '18px', margin: '0', accentColor: DIALOG.titleBar } as CSSStyleDeclaration);
      rb.addEventListener('change', () => { if (rb.checked) cut = c; });
      lab.appendChild(rb);
      lab.appendChild(document.createTextNode(c === 'full' ? copy.cut.full : copy.cut.speedrun));
      fs.appendChild(lab);
    }
    body.appendChild(fs);
  }
  function deviceFoot(body: HTMLDivElement, enter: HTMLButtonElement | null, note?: HTMLElement): void {
    const foot = document.createElement('div');
    Object.assign(foot.style, { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', margin: '0 0 6px' } as CSSStyleDeclaration);
    if (enter) {
      enter.disabled = !armed || entered;
      enterButtons.add(enter);
      foot.appendChild(enter);
    }
    if (note) foot.appendChild(note);
    if (enter) {
      const wait = el('div', `(${door.wait})`, { fontSize: '12px', color: DIALOG.dim, display: arming && !armed ? 'block' : 'none' });
      waitNotes.add(wait);
      const ready = el('div', door.enterNote, { fontSize: '12px', color: DIALOG.dim, display: armed ? 'block' : 'none' });
      enterNotes.add(ready);
      foot.appendChild(wait);
      foot.appendChild(ready);
    }
    body.appendChild(foot);
  }
  function controls(body: HTMLDivElement, lines: string[]): void {
    const ul = document.createElement('ul');
    Object.assign(ul.style, { margin: '0 0 12px', padding: '0 0 0 18px', listStyle: 'square' } as CSSStyleDeclaration);
    for (const t of lines) ul.appendChild(el('li', t, { fontSize: '13px', lineHeight: '1.5', marginBottom: '3px' }));
    body.appendChild(ul);
  }

  function openComputer(): void {
    const c = door.cards.desktop;
    openCard('computer', c.heading, (body) => {
      controls(body, c.lines);
      cutChoice(body);
      const enter = btn(c.button, () => {
        if (!armed || destroyed) return;
        goFullscreen(); // must happen INSIDE the click stack
        enterWith('desktop');
      });
      deviceFoot(body, immersive ? null : enter);
    });
  }

  function openTablet(): void {
    const c = door.cards.phone;
    openCard('tablet', c.heading, (body) => {
      controls(body, c.lines);
      cutChoice(body);
      const note = el('div', '', { fontSize: '12px', color: DIALOG.dim, display: 'none' });
      const enter = btn(c.button, () => {
        if (!armed || destroyed || entered) return;
        goFullscreen();
        type Requestable = { requestPermission?: () => Promise<PermissionState | string> };
        const req = (window.DeviceOrientationEvent as unknown as Requestable | undefined)?.requestPermission;
        if (typeof req !== 'function') {
          ledger.view.motion = 'granted';
          enterWith('phone');
          return;
        }
        note.textContent = c.asking;
        note.style.display = 'block';
        for (const b of enterButtons) b.disabled = true;
        req.call(window.DeviceOrientationEvent)
          .then((res: string) => { ledger.view.motion = res === 'granted' ? 'granted' : 'denied'; })
          .catch(() => { ledger.view.motion = 'denied'; })
          .then(() => {
            if (destroyed) return;
            if (ledger.view.motion === 'denied') note.textContent = c.denied;
            enterWith('phone');
          });
      });
      deviceFoot(body, immersive ? null : enter, note);
    });
  }

  function openHeadset(): void {
    const c = door.cards.headset;
    openCard('headset', c.heading, (body) => {
      controls(body, immersive ? [c.lines[0], copy.xr.select, c.lines[2]] : c.lines);
      if (!vrReady) {
        deviceFoot(body, null, el('div', c.unavailable, { fontSize: '12px', color: DIALOG.dim }));
        return;
      }
      if (!immersive) body.appendChild(btn(copy.xr.preview, () => enterImmersiveHome()));
      cutChoice(body);
      const enter = btn(c.button, () => {
        if (!armed || destroyed) return;
        if (!immersive) { enterImmersiveHome(); return; }
        requestImmersiveVrEntry();
        enterWith('headset');
      });
      deviceFoot(body, enter);
    });
  }

  // ── S230: the return ──────────────────────────────────────────────────────────────────────────────────────────
  /** START AGAIN: what the menu's Restart does (the ledger wiped, a reload; `#home-armed` so Home arms at once, the
   *  notice having been read in this tab). The new visit goes Home → 1997 by the normal path. */
  function startAgain(): void {
    if (entered || destroyed) return;
    entered = true;
    wipeLedger();
    try { window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search + '#home-armed'); } catch { /* start unarmed */ }
    window.location.reload();
  }
  function openAgain(k: 'computer' | 'tablet' | 'headset'): void {
    const c = door.cards[k === 'computer' ? 'desktop' : k === 'tablet' ? 'phone' : 'headset'];
    openCard(k, c.heading, (body) => {
      body.appendChild(para(copy.return.again.body));
      const b = btn(copy.return.again.button, () => startAgain());
      b.dataset.homeAgain = '1';
      Object.assign(b.style, { margin: '0 0 6px' } as CSSStyleDeclaration);
      body.appendChild(b);
    });
  }

  /** the Lexicon's card: the Close's own faces (The Words, The Reasons, Your Words — src/room/lexicon.ts), drawn on a
   *  canvas exactly as the machine draws them, with a real button laid over each of its published hit rects so it is
   *  reachable by keyboard and by touch. Reading only: Your Words comes from this visit's memory, nothing is filed. */
  function openLexicon(): void {
    const book = new Lexicon();
    const LW = ERA1_CANVAS.width, LH = ERA1_CANVAS.height;
    const labels: Record<string, string> = {
      'lex-words': lex.tabs.words, 'lex-reasons': lex.tabs.reasons, 'lex-yours': lex.tabs.yours, 'lex-sources': lex.tabs.sources, 'lex-close': lex.tabs.close,
      'lex-prev': lex.prev, 'lex-next': lex.next, 'lex-title': lex.title
    };
    openCard('lexicon', `${lex.title} — ${lex.edition}`, (body) => {
      const wrap = document.createElement('div');
      Object.assign(wrap.style, { position: 'relative', width: '100%', maxWidth: `${LW}px`, aspectRatio: `${LW} / ${LH}`, margin: '0 auto 12px' } as CSSStyleDeclaration);
      const cv = document.createElement('canvas');
      cv.width = LW * RENDER_SCALE; cv.height = LH * RENDER_SCALE;
      cv.setAttribute('aria-hidden', 'true');
      Object.assign(cv.style, { width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' } as CSSStyleDeclaration);
      wrap.appendChild(cv);
      const overlay = document.createElement('div');
      Object.assign(overlay.style, { position: 'absolute', inset: '0' } as CSSStyleDeclaration);
      wrap.appendChild(overlay);
      body.insertBefore(wrap, body.firstChild);
      // S233: the Sources face is drawn on the canvas (aria-hidden, and small on a phone), so on that tab its addresses are
      // ALSO here as plain selectable text under the glass, in the same order: legible, copyable, readable by a screen
      // reader. Printed, never fetched or opened (the piece makes no network calls).
      const srcList = document.createElement('ul');
      srcList.setAttribute('aria-label', lex.tabs.sources);
      Object.assign(srcList.style, { display: 'none', margin: '0 0 10px', padding: '0 0 0 18px', fontSize: '12px', lineHeight: '1.45', userSelect: 'text' } as CSSStyleDeclaration);
      for (const s of LEXICON_SOURCES) {
        const li = document.createElement('li');
        li.style.marginBottom = '6px';
        li.appendChild(document.createTextNode(s.label));
        li.appendChild(document.createElement('br'));
        const u = el('span', s.url, { wordBreak: 'break-all', color: DIALOG.dim });
        li.appendChild(u);
        srcList.appendChild(li);
      }
      const hits: { x: number; y: number; w: number; h: number; id: string }[] = [];
      const ctx = cv.getContext('2d')!;
      const redraw = (focusId?: string): void => {
        ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
        ctx.imageSmoothingEnabled = false;
        book.draw(ctx, LW, LH, hits);
        srcList.style.display = book.face === 'sources' ? 'block' : 'none';
        overlay.replaceChildren();
        for (const h of hits) {
          const b = document.createElement('button');
          b.type = 'button';
          b.dataset.lex = h.id;
          b.setAttribute('aria-label', labels[h.id] ?? h.id);
          Object.assign(b.style, {
            position: 'absolute', left: `${(h.x / LW) * 100}%`, top: `${(h.y / LH) * 100}%`,
            width: `${(h.w / LW) * 100}%`, height: `${(h.h / LH) * 100}%`,
            background: 'transparent', border: '0', padding: '0', margin: '0', cursor: 'pointer'
          } as CSSStyleDeclaration);
          b.addEventListener('focus', () => { b.style.outline = `2px dashed ${HOME.accent}`; b.style.outlineOffset = '-2px'; });
          b.addEventListener('blur', () => { b.style.outline = 'none'; });
          b.addEventListener('click', () => {
            if (h.id === 'lex-close') { closeCard(); return; }
            if (book.press(h.id)) redraw(h.id);
          });
          overlay.appendChild(b);
        }
        if (focusId) (overlay.querySelector(`[data-lex="${focusId}"]`) as HTMLElement | null)?.focus();
      };
      redraw();
      // its sources, in the Lexicon's own plain sentence, and the way to them (the menu's Credits, as the plaque has)
      body.insertBefore(srcList, wrap.nextSibling);
      body.insertBefore(para(lex.sources, { fontSize: '12px', color: DIALOG.dim, margin: '0 0 10px' }), srcList.nextSibling);
      const src = btn(copy.plaque.credits, () => { closeCard(true); gameMenuBus.openCredits?.(); });
      src.dataset.homeLexSources = '1';
      body.insertBefore(src, srcList.nextSibling?.nextSibling ?? null);
    }, undefined, true);
  }

  // ── the objects ──
  function press(k: HomeObject): void {
    if (destroyed || entered) return;
    switch (k) {
      case 'notice':
        noticeSeen = true;
        refreshState();
        openCard('notice', copy.notice.title, (body) => {
          body.appendChild(para(door.contentNote));
          const sd = btn(copy.notice.shortDoor, () => takeShortDoor());
          Object.assign(sd.style, { fontSize: '12px', margin: '2px 0 4px' } as CSSStyleDeclaration);
          if (!immersive) body.appendChild(sd);
        }, isReturn ? undefined : startArming);
        return;
      case 'plaque':
        openCard('plaque', copy.plaque.title, (body) => {
          const head = document.createElement('div');
          Object.assign(head.style, { display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', margin: '0 0 2px' } as CSSStyleDeclaration);
          head.appendChild(el('div', door.title, { fontSize: '15px', fontWeight: '700', letterSpacing: '1px' }));
          const tag = el('div', VERSION_TAG, { fontSize: '11px', padding: '1px 6px', background: DIALOG.paper });
          domBevel(tag, true, 1);
          head.appendChild(tag);
          body.appendChild(head);
          if (isReturn) {   // S233: the fuller explainer (what it is, whose it is, what it rests on, who made it)
            body.appendChild(para(copy.return.plaque.what));
            body.appendChild(para(copy.return.plaque.part));
            body.appendChild(para(copy.return.plaque.made));
          } else {
            body.appendChild(para(door.subtitle, { fontSize: '12px', color: DIALOG.dim }));
            body.appendChild(para(door.premise));
            body.appendChild(para(door.about));
          }
          body.appendChild(btn(copy.plaque.credits, () => {
            closeCard(true);
            gameMenuBus.openCredits?.();
          }));
        });
        return;
      case 'lexicon':
        if (!isReturn) { say(copy.lamby.lexiconLater); return; }   // drawn dead until the Close brings the visitor back
        // S233: the first press on the lit Lexicon gets Lamby's line, then it opens (a second press opens it at once)
        if (!lexiconSaid) {
          lexiconSaid = true;
          say(copy.return.lamby.lexicon);
          lexiconTimer = window.setTimeout(() => { lexiconTimer = 0; if (!destroyed && !cardOpen) openLexicon(); }, LEXICON_SAY_MS);
        } else {
          window.clearTimeout(lexiconTimer); lexiconTimer = 0;
          openLexicon();
        }
        return;
      case 'armchair':
        openCard('armchair', copy.armchair.title, (body) => {
          body.appendChild(para(copy.armchair.body));
        }, () => say(copy.lamby.armchair));   // S231: the chair is part of GPT's room picture and no longer swivels on the press
        return;
      case 'clock':   // the toys (round4): no card, no bubble, nothing kept
        clockQuarter = (clockQuarter + 1) % 4;
        turnToys();
        return;
      case 'calendar':
        month = (month + 1) % 12;
        turnToys();
        return;
      case 'remote':
        openCard('remote', copy.remote.title, (body) => {
          body.appendChild(para(door.captionsLabel, { fontWeight: '700', margin: '0 0 4px' }));
          body.appendChild(para(door.captionsNote));
          const t = btn(ledger.view.captions ? copy.remote.on : copy.remote.off, () => {
            ledger.view.captions = !ledger.view.captions;
            t.textContent = ledger.view.captions ? copy.remote.on : copy.remote.off;
            t.setAttribute('aria-pressed', String(ledger.view.captions));
            if (capBox) capBox.checked = ledger.view.captions;
          });
          t.setAttribute('aria-pressed', String(ledger.view.captions));
          body.appendChild(t);
        });
        return;
      case 'switch':
        openCard('switch', copy.switch.title, (body) => {
          body.appendChild(para(door.menuLine));
          body.appendChild(btn(copy.switch.open, () => { closeCard(true); gameMenuBus.open(); }));
        });
        return;
      case 'door':
        openCard('door', copy.door.title, (body) => {
          body.appendChild(para(isReturn ? copy.return.door.note : copy.door.note));
          const row = document.createElement('div');
          Object.assign(row.style, { display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '0 0 6px' } as CSSStyleDeclaration);
          row.appendChild(btn(copy.door.leave, () => {
            if (!isReturn) { doLeave(); return; }
            // S233: on the return the door's Leave opens the Leave page (the same encyclopedia lookalike Leave opens inside
            // the piece), whose way back lands here; "Leave for good" on it is this door's own old Leave
            closeCard();
            (leavePage ??= mountLeavePage()).show(doLeave);
          }));
          row.appendChild(btn(copy.door.stay, () => closeCard()));
          body.appendChild(row);
        });
        return;
      case 'computer': if (isReturn) openAgain('computer'); else openComputer(); return;
      case 'tablet': if (isReturn) openAgain('tablet'); else openTablet(); return;
      case 'headset': if (isReturn) openAgain('headset'); else openHeadset(); return;
      case 'lamby': {
        const lines = isReturn ? copy.return.lamby.chatter : copy.lamby.chatter;
        say(lines[chatter % lines.length]);
        chatter++;
        return;
      }
    }
  }

  /** Leave, before anything has started: exactly the orienting card's — the ledger wiped, an inert page */
  function doLeave(): void {
    if (destroyed) return;
    wipeLedger();
    if (isReturn) gameMenuBus.leaveEngine?.();   // S230: the Close's engine is still running behind this page — end it too
    window.clearTimeout(armTimer);
    window.clearTimeout(lexiconTimer);
    armed = false;
    closeCard(true);
    stage.remove();
    // S237: "You left." is an inert page, not a window: the bars and the frame go with the room
    titleBar.style.display = 'none'; statusBar.style.display = 'none';
    win.style.border = '0'; win.style.background = 'transparent'; client.style.background = 'transparent';
    const dlg = document.createElement('div');
    Object.assign(dlg.style, { width: 'min(420px, 100%)', background: DIALOG.panel, padding: '16px 18px', boxSizing: 'border-box', margin: 'auto' } as CSSStyleDeclaration);
    domBevel(dlg);
    dlg.appendChild(el('div', door.leftTitle, { fontSize: '15px', fontWeight: '700', marginBottom: '8px' }));
    dlg.appendChild(el('div', door.leftBody, { fontSize: '13px', lineHeight: '1.6' }));
    veil.replaceChildren(dlg);
    veil.style.display = 'flex';
    root.style.background = `rgb(${DIALOG.veilRGB})`;
  }

  /** the short door: today's orienting card, content note and arm-delay intact; only the room is skipped */
  function takeShortDoor(): void {
    if (destroyed) return;
    teardown(true);
    shortDoor = mountOrientingCard(onContinue);
  }

  function teardown(now: boolean): void {
    if (destroyed) return;
    destroyed = true;
    fadeMusic();
    window.clearTimeout(armTimer);
    window.clearTimeout(lexiconTimer);
    window.removeEventListener('resize', layoutAll);
    xrFace?.destroy(); xrFace = null;
    if (now || reducedMotion()) { root.remove(); return; }
    // the bridge (design §3): the room fades as the 3D room's light comes up behind it
    root.style.pointerEvents = 'none';
    root.style.opacity = '0';
    window.setTimeout(() => root.remove(), 750);
  }

  // ⚑ S235 — the room's music (his, 2026-10-11: a 20 s loopable tune, Suno). A browser plays sound only after a
  // press, so it starts with the first press or key in the room and loops softly; it fades out when the room goes
  // (Enter, Leave, the short door). The menu's mute and the idle cycle's mute reach it (it is a tracked one-shot).
  // ⚑ S237 — the bottom bar's Music box controls it: the first press in the room still starts it (unless it was
  // switched off here), and the box reflects whether it is playing.
  let music: HTMLAudioElement | null = null;
  let musicOff = false;   // he unchecked Music: no later press starts it again
  const syncMusic = (): void => { if (musicBox) musicBox.checked = !!music; };
  const startMusic = (): void => {
    if (music || destroyed) return;
    music = playLoop('lambyos_home_loop.mp3');
    if (music) music.volume = 0.4;
    syncMusic();
  };
  const autoMusic = (e: Event): void => {
    if (musicOff || music) return;
    if ((e.target as Element | null)?.closest?.('[data-home-bar="music"]')) return;   // a press on the box itself is its own say
    startMusic();
  };
  function fadeMusic(): void {
    const a = music; music = null;
    syncMusic();
    if (!a) return;
    const v0 = a.volume, t0 = performance.now();
    const step = (): void => {
      const k = Math.min(1, (performance.now() - t0) / 1200);
      a.volume = v0 * (1 - k);
      if (k < 1) requestAnimationFrame(step); else stopClip(a);
    };
    requestAnimationFrame(step);
  }
  root.addEventListener('pointerdown', autoMusic, { capture: true });
  root.addEventListener('keydown', autoMusic, { capture: true });

  // ── S237: the window's bars, filled (title bar: mark, title | PC Simulator, _ □ X; bottom bar: captions, controls…) ──
  function fillBars(): void {
    const NS = 'http://www.w3.org/2000/svg';
    titleBar.appendChild(drawMark(18));
    const titleText = document.createElement('div');
    Object.assign(titleText.style, { flex: '1 1 auto', minWidth: '0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.5px' } as CSSStyleDeclaration);
    titleText.textContent = door.title;
    titleText.appendChild(el('span', ` | ${copy.window.titleSuffix}`, { fontWeight: '400', letterSpacing: '0' }));
    titleBar.appendChild(titleText);
    /** a title-bar box: a bevelled face with a pixel glyph (the _ and □ are drawn only; the X is a real button) */
    const boxGlyph = (kind: 'min' | 'max' | 'close'): SVGSVGElement => {
      const g = document.createElementNS(NS, 'svg');
      g.setAttribute('viewBox', '0 0 8 8'); g.setAttribute('width', '10'); g.setAttribute('height', '10'); g.setAttribute('aria-hidden', 'true');
      g.style.flex = 'none'; g.style.shapeRendering = 'crispEdges';
      const q = document.createElementNS(NS, 'path');
      q.setAttribute('d', kind === 'min' ? 'M0 6H6V8H0Z' : kind === 'max' ? 'M0 0H8V8H0ZM1 2V7H7V2Z' : 'M0 0H2L4 2L6 0H8L5 3L8 6V8H6L4 5L2 8H0V6L3 3Z');
      q.setAttribute('fill', DIALOG.ink);
      g.appendChild(q);
      return g;
    };
    const boxFace = (b: HTMLElement): void => {
      Object.assign(b.style, { display: 'flex', alignItems: 'center', justifyContent: 'center', background: DIALOG.panel, boxSizing: 'border-box', padding: '0', margin: '0', borderRadius: '0' } as CSSStyleDeclaration);
      domBevel(b);
    };
    for (const kind of ['min', 'max'] as const) {
      const b = document.createElement('div');
      b.className = 'hw-box hw-inert';
      b.setAttribute('aria-hidden', 'true');
      boxFace(b);
      b.appendChild(boxGlyph(kind));
      titleBar.appendChild(b);
    }
    const closeX = document.createElement('button');
    closeX.type = 'button';
    closeX.className = 'hw-box hw-x';
    closeX.dataset.homeBar = 'x';
    closeX.setAttribute('aria-label', copy.door.leave);
    boxFace(closeX);
    closeX.style.cursor = 'pointer';
    closeX.appendChild(boxGlyph('close'));
    closeX.addEventListener('click', () => buttons.door.click());   // the door's Leave card, exactly
    titleBar.appendChild(closeX);

    // the bottom bar
    const check = (label: string, id: string, checked: boolean, onChange: (on: boolean) => void): { wrap: HTMLLabelElement; box: HTMLInputElement } => {
      const wrap = document.createElement('label');
      wrap.className = 'hw-chk';
      wrap.dataset.homeBar = id;
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = checked;
      box.addEventListener('change', () => onChange(box.checked));
      wrap.appendChild(box);
      wrap.appendChild(document.createTextNode(label));
      return { wrap, box };
    };
    const barBtn = (label: string, id: string, cls: string, onClick: () => void): HTMLButtonElement => {
      const b = btn(label, onClick);
      b.dataset.homeBar = id;
      b.classList.add(cls);
      return b;
    };
    const spacer = (): HTMLDivElement => { const d = document.createElement('div'); d.style.flex = '1 1 0'; d.style.minWidth = '0'; d.setAttribute('aria-hidden', 'true'); return d; };
    const cap = check(copy.window.captions, 'captions', ledger.view.captions, (on) => { ledger.view.captions = on; });
    capBox = cap.box;
    const mus = check(copy.window.music, 'music', false, (on) => {
      if (on) { musicOff = false; startMusic(); syncMusic(); } else { musicOff = true; fadeMusic(); }
    });
    musicBox = mus.box;
    const esc = el('div', copy.window.escHint, {});
    esc.className = 'hw-esc';
    statusBar.append(
      cap.wrap, spacer(),
      barBtn(menuCopy.controls, 'controls', 'hw-controls', () => gameMenuBus.openControls?.()),
      barBtn(copy.window.credits, 'credits', 'hw-credits', () => gameMenuBus.openCredits?.()),
      barBtn(menuCopy.title, 'menu', 'hw-menu', () => gameMenuBus.open()),
      barBtn(copy.door.leave, 'leave', 'hw-leave', () => buttons.door.click()),
      spacer(), mus.wrap, esc
    );
  }

  window.addEventListener('resize', layoutAll);
  document.body.appendChild(root);
  fillBars();
  layoutAll();
  say(isReturn ? copy.return.lamby.greet : returning ? copy.lamby.greetAgain : copy.lamby.greet);
  if (returning) startArming();
  if (isReturn) {
    // the Close gives way to the room: it fades up over the canvas, and the shelf's book takes the eye's place for
    // keyboards (a conducted focus; nothing is chosen for anyone)
    requestAnimationFrame(() => { root.style.opacity = '1'; });
    window.setTimeout(() => { if (!destroyed && !cardOpen) buttons.lexicon.focus({ preventScroll: true }); }, reducedMotion() ? 0 : 2300);
  }

  // the headset: Enter VR only where this browser has confirmed an immersive session (as the orienting card did)
  if (!isReturn && new URLSearchParams(window.location.search).get('flat') !== '1' && navigator.xr) {
    void navigator.xr.isSessionSupported('immersive-vr').then(async (supported) => {
      if (!supported || destroyed) return;
      const cv = document.getElementById('app');
      if (!(cv instanceof HTMLCanvasElement)) return;
      const { mountHomeXr } = await import('./homeXr');
      if (destroyed) return;
      vrReady = await prepareImmersiveVrEntry(cv);
      if (destroyed) return;
      const shell = preparedHomeShell();
      if (vrReady && shell) {
        xrFace = mountHomeXr(shell, {
          root, veil,
          state: () => ({ armed, entered, clockQuarter, month, isReturn, noticeSeen, bubble: bubble.style.display !== 'none' && !cardOpen ? bubbleText.textContent ?? '' : '' }),
          press: (k) => buttons[k].click(),
          dismiss: () => bubbleX.click(),
          onImmersive: (active) => {
            immersive = active;
            if (cardOpen === 'computer') openComputer();
            if (cardOpen === 'tablet') openTablet();
            if (cardOpen === 'headset') openHeadset();
            if (cardOpen === 'notice') press('notice');
          }
        });
        if (!shell.started) { shell.app.start(); shell.started = true; }
      }
      if (vrReady && cardOpen === 'headset' && cardBody) openHeadset();
    }).catch(() => { /* the unsupported path: the headset card says so */ });
  }

  return {
    destroy(): void {
      if (shortDoor) { shortDoor.destroy(); shortDoor = null; return; }
      teardown(false);
    }
  };
}
