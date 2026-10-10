/**
 * ⚑ S227 — LAMBYOS HOME, first pass: the programme's front door, the way Bob was Windows'
 * (docs/reinterp/LAMBYOS_HOME_DESIGN_2026-10-09.md, his answers in §7).
 *
 * WHAT IT IS. A flat illustrated 1997 living room (DOM + one canvas; the art is homeArt.ts), mounted where the
 * orienting card used to be mounted (src/main.ts): before the engine starts, beside the game menu, so Esc and the
 * corner glyph work from its first frame. Each object teaches one thing and opens one plain card in the FRAME's
 * voice (functional, undecorated; the orienting card's own words, from orientingCard.json, unchanged). The room
 * and Lamby's bubbles are the PROGRAMME's (register operable): they may charm; they never carry a frame word.
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
import copy from '../../../data/strings/home.json';
import door from '../../../data/strings/orientingCard.json';
import { prepareImmersiveVrEntry, requestImmersiveVrEntry } from '../../engine/app';
import { ledger, wipeLedger } from '../../state/ledger';
import { gameMenuBus } from '../../state/gameMenuBus';
import { chooseCut, currentCut, type Cut } from '../../state/cut';
import { DIALOG, domBevel } from '../theme/chrome';
import { ERA1 } from '../theme/era1';
import { HOME } from '../theme/home';
import { mountOrientingCard, type DoorChoice } from '../orientingCard';
import {
  SPRITES, LAMBY_SIZE, drawBackdrop, drawLamby, drawSprite, finalHits, tallLayout, wideLayout,
  type HomeLayout, type HomeObject, type Rect
} from './homeArt';

const ARM_DELAY_MS = 4000; // the same ethics arm-delay as the orienting card
const MIN_TARGET_CSS = 44; // design §4: every object's hit area, whatever the art's size
declare const __APP_VERSION__: string;
const VERSION_TAG = door.versionTag.replace('{v}', typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0');

export interface LambyosHome { destroy(): void }

/** the reading order of design §1's table: door, notice, plaque, tape, armchair, remote, switch, the devices; Lamby last */
const ORDER: HomeObject[] = ['door', 'notice', 'plaque', 'tape', 'armchair', 'remote', 'switch', 'computer', 'tablet', 'headset', 'lamby'];

const reducedMotion = (): boolean => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

export function mountLambyosHome(onContinue: (choice: DoorChoice) => void): LambyosHome {
  let destroyed = false;
  let entered = false;
  let armed = false;
  let armTimer = 0;
  let arming = false;
  let cut: Cut = currentCut();
  let vrReady = false;
  let chairFrame = 0;
  let shortDoor: { destroy(): void } | null = null;

  // ── a Restart in this tab: the notice was read minutes ago (design §3, way 2) ──
  const returning = window.location.hash === '#home-armed';
  if (returning) {
    try { window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search); } catch { /* keep the hash */ }
  }

  // ── the root: a fixed layer under the game menu (1000), as the orienting card was (900) ──
  const root = document.createElement('div');
  root.id = 'lambyos-home';
  root.setAttribute('role', 'main');
  root.setAttribute('aria-label', copy.roomLabel);
  Object.assign(root.style, {
    position: 'fixed', inset: '0', zIndex: '900', overflow: 'hidden',
    background: HOME.wallLo, font: DIALOG.font, color: DIALOG.ink,
    transition: 'opacity 0.7s'
  } as CSSStyleDeclaration);

  const stage = document.createElement('div');
  Object.assign(stage.style, { position: 'absolute' } as CSSStyleDeclaration);
  root.appendChild(stage);

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'absolute', left: '0', top: '0', imageRendering: 'pixelated' } as CSSStyleDeclaration);
  stage.appendChild(canvas);

  const lambyCanvas = document.createElement('canvas');
  lambyCanvas.width = LAMBY_SIZE.w; lambyCanvas.height = LAMBY_SIZE.h;
  lambyCanvas.setAttribute('aria-hidden', 'true');
  Object.assign(lambyCanvas.style, { position: 'absolute', imageRendering: 'pixelated', pointerEvents: 'none' } as CSSStyleDeclaration);
  stage.appendChild(lambyCanvas);

  // ── the objects: real buttons over the art, in the design's reading order ──
  const focusCss = document.createElement('style');
  focusCss.textContent =
    `#lambyos-home [data-home]{background:transparent;border:0;padding:0;margin:0;cursor:pointer;position:absolute;border-radius:0}` +
    `#lambyos-home [data-home][aria-disabled="true"]{cursor:default}` +
    `#lambyos-home [data-home]:focus-visible{outline:2px dashed ${HOME.accent};outline-offset:1px}` +
    `#lambyos-home [data-home]:hover:not([aria-disabled="true"]){outline:1px solid ${HOME.accent};outline-offset:0}` +
    `#lambyos-home .home-btn{font:inherit;font-size:13px;min-height:44px;padding:8px 16px;background:${DIALOG.panel};color:${DIALOG.ink};border-radius:0;cursor:pointer}` +
    `#lambyos-home .home-btn:disabled{color:${DIALOG.faint};cursor:not-allowed}` +
    `#lambyos-home .home-btn:focus-visible{outline:2px dotted ${DIALOG.ink};outline-offset:-6px}` +
    `@media (prefers-reduced-motion: reduce){#lambyos-home{transition:none!important}}`;
  root.appendChild(focusCss);

  const buttons = {} as Record<HomeObject, HTMLButtonElement>;
  for (const k of ORDER) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.home = k;
    b.setAttribute('aria-label', copy.objects[k]);
    if (k === 'tape') b.setAttribute('aria-disabled', 'true'); // the advert needs its drawing; the tape is just the tape
    b.addEventListener('click', () => press(k));
    buttons[k] = b;
    stage.appendChild(b);
  }

  // ── Lamby's bubble: the programme's voice, the 1997 tooltip's paper ──
  const bubble = document.createElement('div');
  bubble.setAttribute('role', 'status');
  bubble.setAttribute('aria-live', 'polite');
  Object.assign(bubble.style, {
    position: 'absolute', display: 'none', boxSizing: 'border-box', maxWidth: '240px',
    background: ERA1.tooltip, color: ERA1.black, border: `2px solid ${ERA1.black}`,
    padding: '8px 40px 8px 10px', fontSize: '13px', lineHeight: '1.4', borderRadius: '10px'
  } as CSSStyleDeclaration);
  const bubbleText = document.createElement('div');
  bubble.appendChild(bubbleText);
  const bubbleTail = document.createElement('div');
  Object.assign(bubbleTail.style, {
    position: 'absolute', bottom: '-10px', width: '0', height: '0',
    borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: `10px solid ${ERA1.black}`
  } as CSSStyleDeclaration);
  bubble.appendChild(bubbleTail);
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
  root.appendChild(veil);

  let layout: HomeLayout = wideLayout();
  let scale = 1;

  // ── drawing ──
  const lit = (k: HomeObject): boolean => k === 'notice' || (armed && (k === 'computer' || k === 'tablet' || k === 'headset'));
  function drawRoom(): void {
    const L = layout;
    canvas.width = L.W; canvas.height = L.H;
    const c = canvas.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    drawBackdrop(c, L, copy.mat);
    drawSprite(c, SPRITES.notice, L.at.notice, { lit: lit('notice') });
    drawSprite(c, SPRITES.lightSwitch, L.at.switch);
    drawSprite(c, SPRITES.plaque, L.at.plaque);
    drawSprite(c, SPRITES.vcr, L.at.vcr);
    drawSprite(c, SPRITES.crt, L.at.crt);
    drawSprite(c, SPRITES.tape, L.at.tape);
    drawSprite(c, SPRITES.computer, L.at.computer, { lit: lit('computer') });
    drawSprite(c, SPRITES.tablet, L.at.tablet, { lit: lit('tablet') });
    drawSprite(c, SPRITES.headset, L.at.headset, { lit: lit('headset') });
    drawSprite(c, SPRITES.chair, L.at.chair, { frame: chairFrame });
    if (chairFrame === 0) drawSprite(c, SPRITES.remote, L.at.remote);
  }

  function place(el: HTMLElement, R: Rect): void {
    Object.assign(el.style, {
      left: `${R.x * scale}px`, top: `${R.y * scale}px`, width: `${R.w * scale}px`, height: `${R.h * scale}px`
    } as CSSStyleDeclaration);
  }

  function layoutAll(): void {
    const vw = window.innerWidth, vh = window.innerHeight;
    layout = vw >= vh ? wideLayout() : tallLayout();
    const fit = Math.min(vw / layout.W, vh / layout.H);
    scale = fit >= 1 ? Math.floor(fit) : fit; // an integer scale wherever the screen allows (pixel discipline)
    const sw = layout.W * scale, sh = layout.H * scale;
    Object.assign(stage.style, {
      width: `${sw}px`, height: `${sh}px`,
      left: `${Math.round((vw - sw) / 2)}px`, top: `${Math.round((vh - sh) / 2)}px`
    } as CSSStyleDeclaration);
    canvas.style.width = `${sw}px`; canvas.style.height = `${sh}px`;
    const hits = finalHits(layout, Math.ceil(MIN_TARGET_CSS / scale));
    for (const k of ORDER) place(buttons[k], hits[k]);
    place(lambyCanvas, { x: layout.at.lamby.x, y: layout.at.lamby.y, w: LAMBY_SIZE.w, h: LAMBY_SIZE.h });
    drawRoom();
    if (bubble.style.display !== 'none') positionBubble();
  }

  // ── Lamby: the one Lamby (apps/lambyChar.ts), cheerful; his fidget runs only while nothing asks for stillness ──
  const born = performance.now();
  let raf = 0;
  const frameLamby = (now: number): void => {
    if (destroyed) return;
    const t = (now - born) / 1000;
    drawLamby(lambyCanvas, { mood: 'cheerful', action: t < 3.2 ? 'appear' : 'idle', t, moodStart: 0 });
    raf = requestAnimationFrame(frameLamby);
  };
  if (reducedMotion()) drawLamby(lambyCanvas, { mood: 'cheerful', action: 'idle', t: 4, moodStart: 0 });
  else raf = requestAnimationFrame(frameLamby);

  function positionBubble(): void {
    const lx = (layout.at.lamby.x + LAMBY_SIZE.w / 2) * scale;
    const ly = (layout.at.lamby.y + 4) * scale;
    const sw = layout.W * scale;
    const bw = Math.min(240, sw - 16);
    bubble.style.width = `${bw}px`;
    const left = Math.max(8, Math.min(sw - bw - 8, Math.round(lx - bw / 2)));
    bubble.style.left = `${left}px`;
    bubble.style.top = `${Math.max(8, Math.round(ly - bubble.offsetHeight - 12))}px`;
    bubbleTail.style.left = `${Math.max(10, Math.min(bw - 26, Math.round(lx - left - 8)))}px`;
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

  function openCard(k: HomeObject, title: string, build: (body: HTMLDivElement) => void, closed?: () => void): void {
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
      width: 'min(480px, 100%)', maxHeight: '100%', display: 'flex', flexDirection: 'column',
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
    drawRoom();
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
      deviceFoot(body, enter);
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
      deviceFoot(body, enter, note);
    });
  }

  function openHeadset(): void {
    const c = door.cards.headset;
    openCard('headset', c.heading, (body) => {
      controls(body, c.lines);
      if (!vrReady) {
        deviceFoot(body, null, el('div', c.unavailable, { fontSize: '12px', color: DIALOG.dim }));
        return;
      }
      cutChoice(body);
      const enter = btn(c.button, () => {
        if (!armed || destroyed) return;
        requestImmersiveVrEntry(); // consumed synchronously inside onContinue's click stack
        enterWith('headset');
      });
      deviceFoot(body, enter);
    });
  }

  // ── the objects ──
  function press(k: HomeObject): void {
    if (destroyed || entered) return;
    switch (k) {
      case 'notice':
        openCard('notice', copy.notice.title, (body) => {
          body.appendChild(para(door.contentNote));
          const sd = btn(copy.notice.shortDoor, () => takeShortDoor());
          Object.assign(sd.style, { fontSize: '12px', margin: '2px 0 4px' } as CSSStyleDeclaration);
          body.appendChild(sd);
        }, startArming);
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
          body.appendChild(para(door.subtitle, { fontSize: '12px', color: DIALOG.dim }));
          body.appendChild(para(door.premise));
          body.appendChild(para(door.about));
          body.appendChild(btn(copy.plaque.credits, () => {
            closeCard(true);
            gameMenuBus.openCredits?.();
          }));
        });
        return;
      case 'tape':
        return; // just the tape, in this pass: the advert waits for its drawing
      case 'armchair':
        turnChair(1, () => openCard('armchair', copy.armchair.title, (body) => {
          body.appendChild(para(copy.armchair.body));
        }, () => turnChair(-1, () => say(copy.lamby.armchair))));
        return;
      case 'remote':
        openCard('remote', copy.remote.title, (body) => {
          body.appendChild(para(door.captionsLabel, { fontWeight: '700', margin: '0 0 4px' }));
          body.appendChild(para(door.captionsNote));
          const t = btn(ledger.view.captions ? copy.remote.on : copy.remote.off, () => {
            ledger.view.captions = !ledger.view.captions;
            t.textContent = ledger.view.captions ? copy.remote.on : copy.remote.off;
            t.setAttribute('aria-pressed', String(ledger.view.captions));
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
          body.appendChild(para(copy.door.note));
          const row = document.createElement('div');
          Object.assign(row.style, { display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '0 0 6px' } as CSSStyleDeclaration);
          row.appendChild(btn(copy.door.leave, () => doLeave()));
          row.appendChild(btn(copy.door.stay, () => closeCard()));
          body.appendChild(row);
        });
        return;
      case 'computer': openComputer(); return;
      case 'tablet': openTablet(); return;
      case 'headset': openHeadset(); return;
      case 'lamby':
        say(copy.lamby.chatter[chatter % copy.lamby.chatter.length]);
        chatter++;
        return;
    }
  }

  /** the armchair turns a quarter at a time (back → side → facing you, and back); reduced motion: a cut */
  let turning = false;
  function turnChair(dir: 1 | -1, done: () => void): void {
    if (turning) return;
    const target = dir === 1 ? 2 : 0;
    if (reducedMotion()) { chairFrame = target; drawRoom(); done(); return; }
    turning = true;
    const step = (): void => {
      if (destroyed) return;
      chairFrame += dir;
      drawRoom();
      if (chairFrame === target) { turning = false; window.setTimeout(done, 220); return; }
      window.setTimeout(step, 260);
    };
    window.setTimeout(step, 60);
  }

  /** Leave, before anything has started: exactly the orienting card's — the ledger wiped, an inert page */
  function doLeave(): void {
    if (destroyed) return;
    wipeLedger();
    window.clearTimeout(armTimer);
    armed = false;
    closeCard(true);
    cancelAnimationFrame(raf);
    stage.remove();
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
    window.clearTimeout(armTimer);
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', layoutAll);
    if (now || reducedMotion()) { root.remove(); return; }
    // the bridge (design §3): the room fades as the 3D room's light comes up behind it
    root.style.pointerEvents = 'none';
    root.style.opacity = '0';
    window.setTimeout(() => root.remove(), 750);
  }

  window.addEventListener('resize', layoutAll);
  document.body.appendChild(root);
  layoutAll();
  say(returning ? copy.lamby.greetAgain : copy.lamby.greet);
  if (returning) startArming();

  // the headset: Enter VR only where this browser has confirmed an immersive session (as the orienting card did)
  if (new URLSearchParams(window.location.search).get('flat') !== '1' && navigator.xr) {
    void navigator.xr.isSessionSupported('immersive-vr').then(async (supported) => {
      if (!supported || destroyed) return;
      const cv = document.getElementById('app');
      if (!(cv instanceof HTMLCanvasElement)) return;
      vrReady = await prepareImmersiveVrEntry(cv);
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
