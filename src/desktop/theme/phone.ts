/**
 * ⚑ THE PHONE'S OWN LOOK — and it is deliberately NOT GracePlatform's.
 *
 * Sérgio, 2026-08-24, on the first build of Era 3's phone: *"on the phone it
 * reads very much Linux and not iOS or Android… I told you not to use the same
 * style of the Grace platform and I was ignored again."* He is right twice
 * over, and the second time is the one that matters: **this is a different
 * device made by a different company, and it should not look like her
 * employer's software.** The whole point of the phone is that it is the part of
 * her life the shift does not own.
 *
 * ⚑ THE THREE THINGS THAT MADE IT READ AS A TERMINAL, in order of damage:
 *
 *  1. **`chrome.ts`'s `setFont` is hardcoded to `monospace`** — every surface in
 *     the piece is one terminal face. A chat app in a fixed-pitch font reads as
 *     a console log, not as a phone. `phoneFont` here uses a system sans stack;
 *     no font is fetched, so the no-network invariant is untouched.
 *  2. **The dark GracePlatform-adjacent palette.** A 2016 phone messaging app is
 *     LIGHT — near-white ground, grey bubbles, one saturated accent — and that
 *     contrast against the era's Aero blue is the point.
 *  3. **Rows and panels instead of a phone's actual furniture:** a status bar
 *     with a battery, an app bar with a back chevron, a home screen of ICONS on
 *     a wallpaper, bubbles with tails, and a modal sheet that comes up from the
 *     bottom edge.
 *
 * ⚑ WHY NEW COLOURS ARE ALLOWED HERE. CLAUDE.md's palette law is "import era
 * palettes from `src/desktop/theme/` — never invent colors", and the ratchet
 * counts literals OUTSIDE this directory. A second device by a second maker
 * legitimately needs a second palette; what the law forbids is a module picking
 * colours for itself, and that is exactly what this file prevents.
 *
 * ⚑ NO REAL PRODUCT IS DEPICTED. This is the shared visual grammar every phone
 * of the period used — status bar, app bar, bubbles, icon grid — and none of
 * the marks, glyphs or wordmarks of any real one.
 */

export const PHONE = {
  /** grouped-table ground, the colour a settings screen sits on */
  bg: '#f2f2f7',
  surface: '#ffffff',
  bar: '#f8f8fa',
  hairline: '#d6d6db',
  ink: '#16161a',
  dim: '#8c8c94',
  faint: '#b8b8c0',
  /** the one saturated accent a phone of this period spends everywhere */
  tint: '#0b7be8',
  tintInk: '#ffffff',
  bubbleIn: '#e7e7ec',
  bubbleOut: '#0b7be8',
  badge: '#e0362c',
  good: '#2fa84a',
  /** the home screen's wallpaper, warm rather than corporate */
  wallTop: '#3c4a63',
  wallMid: '#5b6b86',
  wallBot: '#8a94a8',
  /** app tile grounds — no real product's colours, just four distinct plates */
  tileGroup: '#2fa84a',
  tileMail: '#0b7be8',
  tileGame: '#e8a33d',
  tileLive: '#c4485f',
  sheetGrip: '#c8c8d0'
} as const;

/**
 * ⚑ A PROPORTIONAL SANS, and it is the single biggest fix in this file.
 * `-apple-system` resolves to the platform UI face on Apple hardware and falls
 * through to Helvetica/Arial/`sans-serif` elsewhere; **nothing is downloaded**,
 * so the no-runtime-network invariant is untouched. `weight` 600 is the only
 * bold used — a phone UI has two weights, not five.
 */
export function phoneFont(
  ctx: CanvasRenderingContext2D, size = 12, weight: 400 | 600 = 400
): void {
  ctx.font = `${weight} ${size}px -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.textBaseline = 'top';
}

/** word-wrap against the CURRENT font — `chrome.ts`'s wrapText assumes nothing
 *  about the face, but it is imported alongside monospace everywhere else, so
 *  this exists to keep a phone module from reaching into the desktop's theme. */
export function phoneWrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? cur + ' ' + w : w;
    if (ctx.measureText(next).width > maxW && cur) { out.push(cur); cur = w; }
    else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}

/** a filled rounded rectangle. `r` is clamped so a short bubble cannot curl
 *  into a lozenge, which is what a naive radius does at 20 px tall. */
export function roundRect(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string
): void {
  const rr = Math.max(0, Math.min(r, Math.floor(Math.min(w, h) / 2)));
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.fill();
}

/** ⚑ the top strip every phone of the period had: time on the left, a little
 *  signal, a battery on the right. It is furniture and it is exactly why a
 *  screen reads as a phone rather than as a window. */
export function statusBar(ctx: CanvasRenderingContext2D, W: number, time: string): number {
  const h = 18;
  ctx.fillStyle = PHONE.bar;
  ctx.fillRect(0, 0, W, h);
  phoneFont(ctx, 10, 600);
  ctx.fillStyle = PHONE.ink;
  ctx.fillText(time, 8, 4);
  // signal: three rising bars
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = PHONE.ink;
    ctx.fillRect(W - 42 + i * 4, 10 - i * 2, 3, 5 + i * 2);
  }
  // battery: a body, a nub, and a fill that is not quite full
  ctx.fillStyle = PHONE.ink;
  ctx.fillRect(W - 24, 5, 18, 9);
  ctx.fillStyle = PHONE.bar;
  ctx.fillRect(W - 23, 6, 16, 7);
  ctx.fillStyle = PHONE.ink;
  ctx.fillRect(W - 5, 8, 2, 3);
  ctx.fillStyle = PHONE.good;
  ctx.fillRect(W - 22, 7, 11, 5);
  return h;
}

/** the app bar: a back chevron, a centred title, an optional subtitle under it.
 *  Returns the y the content may start at. */
export function appBar(
  ctx: CanvasRenderingContext2D, W: number, y: number, title: string, sub = ''
): number {
  const h = sub ? 38 : 30;
  ctx.fillStyle = PHONE.bar;
  ctx.fillRect(0, y, W, h);
  ctx.fillStyle = PHONE.hairline;
  ctx.fillRect(0, y + h - 1, W, 1);
  // chevron, drawn rather than typed so it is never a font's idea of one
  ctx.strokeStyle = PHONE.tint;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(14, y + 10); ctx.lineTo(9, y + 15); ctx.lineTo(14, y + 20);
  ctx.stroke();
  phoneFont(ctx, 13, 600);
  ctx.fillStyle = PHONE.ink;
  const tw = ctx.measureText(title).width;
  ctx.fillText(title, Math.round((W - tw) / 2), y + (sub ? 6 : 9));
  if (sub) {
    phoneFont(ctx, 10);
    ctx.fillStyle = PHONE.dim;
    const sw = ctx.measureText(sub).width;
    ctx.fillText(sub, Math.round((W - sw) / 2), y + 23);
  }
  return y + h;
}

/** a message bubble with a tail. `side` decides which edge the tail hangs off.
 *  ⚑ Era 3 draws every bubble on the LEFT and that is the observation, not an
 *  oversight — see phoneE3's note on the empty right-hand side. */
export function bubble(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, side: 'in' | 'out'
): void {
  const fill = side === 'in' ? PHONE.bubbleIn : PHONE.bubbleOut;
  roundRect(ctx, x, y, w, h, 9, fill);
  ctx.fillStyle = fill;
  ctx.beginPath();
  if (side === 'in') {
    ctx.moveTo(x + 2, y + h - 10);
    ctx.lineTo(x - 4, y + h);
    ctx.lineTo(x + 10, y + h);
  } else {
    ctx.moveTo(x + w - 2, y + h - 10);
    ctx.lineTo(x + w + 4, y + h);
    ctx.lineTo(x + w - 10, y + h);
  }
  ctx.closePath();
  ctx.fill();
}

/** a round avatar with an initial in it — one of four plates, picked from the
 *  name so a person keeps the same colour everywhere. */
export function avatar(
  ctx: CanvasRenderingContext2D, x: number, y: number, s: number, name: string
): void {
  const plates = [PHONE.tileGroup, PHONE.tileMail, PHONE.tileGame, PHONE.tileLive];
  let n = 0;
  for (let i = 0; i < name.length; i++) n = (n + name.charCodeAt(i)) % 997;
  ctx.fillStyle = plates[n % plates.length];
  ctx.beginPath();
  ctx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2);
  ctx.fill();
  phoneFont(ctx, Math.round(s * 0.46), 600);
  ctx.fillStyle = PHONE.tintInk;
  const ch = (name.trim()[0] ?? '?').toUpperCase();
  const cw = ctx.measureText(ch).width;
  ctx.fillText(ch, x + (s - cw) / 2, y + s * 0.26);
}

/** a home-screen app tile: a rounded plate, a simple drawn glyph, a label
 *  under it, and a count badge when there is something waiting. */
export function appTile(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, s: number, plate: string, glyph: 'chat' | 'mail' | 'game' | 'live',
  label: string, badge = ''
): void {
  roundRect(ctx, x, y, s, s, Math.round(s * 0.24), plate);
  ctx.fillStyle = PHONE.tintInk;
  if (glyph === 'chat') {
    roundRect(ctx, x + 8, y + 10, s - 16, s - 22, 4, PHONE.tintInk);
    ctx.fillStyle = PHONE.tintInk;
    ctx.beginPath();
    ctx.moveTo(x + 14, y + s - 12); ctx.lineTo(x + 14, y + s - 5); ctx.lineTo(x + 22, y + s - 12);
    ctx.closePath(); ctx.fill();
  } else if (glyph === 'mail') {
    // an envelope: a plate with its fold drawn across it
    roundRect(ctx, x + 7, y + 12, s - 14, s - 24, 3, PHONE.tintInk);
    ctx.strokeStyle = plate; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 13); ctx.lineTo(x + s / 2, y + s / 2 + 2); ctx.lineTo(x + s - 8, y + 13);
    ctx.stroke();
  } else if (glyph === 'game') {
    roundRect(ctx, x + 7, y + 14, s - 14, s - 26, 5, PHONE.tintInk);
    ctx.fillStyle = plate;
    ctx.fillRect(x + 12, y + s / 2 - 1, 8, 2);
    ctx.fillRect(x + 15, y + s / 2 - 4, 2, 8);
    ctx.beginPath(); ctx.arc(x + s - 15, y + s / 2, 2.5, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = PHONE.tintInk;
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 12); ctx.lineTo(x + s - 11, y + s / 2); ctx.lineTo(x + 12, y + s - 12);
    ctx.closePath(); ctx.fill();
  }
  phoneFont(ctx, 9);
  ctx.fillStyle = PHONE.tintInk;
  const lw = ctx.measureText(label).width;
  ctx.fillText(label, x + (s - lw) / 2, y + s + 4);
  if (badge) {
    phoneFont(ctx, 9, 600);
    const bw = Math.max(14, ctx.measureText(badge).width + 8);
    roundRect(ctx, x + s - bw + 6, y - 5, bw, 14, 7, PHONE.badge);
    ctx.fillStyle = PHONE.tintInk;
    ctx.fillText(badge, x + s - bw + 6 + (bw - ctx.measureText(badge).width) / 2, y - 2);
  }
}

/** ⚑ THE FURNITURE ICONS — a camera, a clock, a calendar, settings, and the
 *  rest of what is on anybody's phone. Sérgio, on the first home screen: *"it
 *  looks more like a phone for seniors"* — and he was right, because four huge
 *  tiles in a 2×2 is a launcher for somebody who has been given a phone, not a
 *  phone somebody LIVES on. These are set dressing at the density a real home
 *  screen has, and they carry no verb: a phone is mostly things you are not
 *  opening right now, and that is what makes the four that matter legible.
 *  ⚑ Deliberately generic shapes — no real product's icon is reproduced. */
export type Furniture =
  | 'camera' | 'clock' | 'calendar' | 'settings'
  | 'photos' | 'weather' | 'notes' | 'files'
  | 'phone' | 'browser' | 'music' | 'maps';

export function furnitureTile(
  ctx: CanvasRenderingContext2D, x: number, y: number, s: number, kind: Furniture, label = ''
): void {
  const plate: Record<Furniture, string> = {
    camera: '#59606e', clock: '#22252c', calendar: '#e8e8ee', settings: '#7b8290',
    photos: '#f0c04a', weather: '#3aa7e0', notes: '#f2e089', files: '#5aa9d6',
    phone: '#2fa84a', browser: '#4f8ede', music: '#e3574f', maps: '#57b07a'
  };
  const ink: Record<Furniture, string> = {
    camera: PHONE.surface, clock: PHONE.surface, calendar: '#e0362c', settings: PHONE.surface,
    photos: PHONE.surface, weather: PHONE.surface, notes: '#6b6540', files: PHONE.surface,
    phone: PHONE.surface, browser: PHONE.surface, music: PHONE.surface, maps: PHONE.surface
  };
  roundRect(ctx, x, y, s, s, Math.round(s * 0.24), plate[kind]);
  const c = s / 2; const k = ink[kind];
  ctx.fillStyle = k; ctx.strokeStyle = k; ctx.lineWidth = 1.5;
  switch (kind) {
    case 'camera':
      roundRect(ctx, x + 5, y + 8, s - 10, s - 15, 3, k);
      ctx.fillStyle = plate[kind];
      ctx.beginPath(); ctx.arc(x + c, y + c + 1, s * 0.16, 0, Math.PI * 2); ctx.fill();
      break;
    case 'clock':
      ctx.beginPath(); ctx.arc(x + c, y + c, s * 0.34, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + c, y + c); ctx.lineTo(x + c, y + c - s * 0.22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + c, y + c); ctx.lineTo(x + c + s * 0.16, y + c); ctx.stroke();
      break;
    case 'calendar':
      ctx.fillRect(x + 5, y + 6, s - 10, 5);
      ctx.fillStyle = '#5a5a62';
      for (let r = 0; r < 2; r++) for (let cN = 0; cN < 3; cN++) {
        ctx.fillRect(x + 7 + cN * 6, y + 15 + r * 6, 4, 4);
      }
      break;
    case 'settings':
      ctx.beginPath(); ctx.arc(x + c, y + c, s * 0.26, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.fillRect(Math.round(x + c + Math.cos(a) * s * 0.34) - 1,
          Math.round(y + c + Math.sin(a) * s * 0.34) - 1, 3, 3);
      }
      break;
    case 'photos':
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x + c + Math.cos(a) * s * 0.16, y + c + Math.sin(a) * s * 0.16, s * 0.13, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'weather':
      ctx.beginPath(); ctx.arc(x + c + 5, y + c - 4, s * 0.15, 0, Math.PI * 2); ctx.fill();
      roundRect(ctx, x + 6, y + c, s - 14, s * 0.3, 4, k);
      break;
    case 'notes':
      ctx.fillRect(x + 6, y + 7, s - 12, s - 14);
      ctx.fillStyle = k === PHONE.surface ? '#9a9a9a' : ink.notes;
      for (let r = 0; r < 3; r++) ctx.fillRect(x + 9, y + 12 + r * 5, s - 18, 1);
      break;
    case 'files':
      ctx.fillRect(x + 6, y + 11, s - 12, s - 18);
      ctx.fillRect(x + 6, y + 8, Math.round(s * 0.4), 4);
      break;
    case 'phone':
      ctx.save();
      ctx.translate(x + c, y + c); ctx.rotate(-0.5);
      roundRect(ctx, -3, -9, 6, 18, 3, k);
      ctx.restore();
      break;
    case 'browser':
      ctx.beginPath(); ctx.arc(x + c, y + c, s * 0.32, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x + c, y + c, s * 0.14, s * 0.32, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + c - s * 0.32, y + c); ctx.lineTo(x + c + s * 0.32, y + c); ctx.stroke();
      break;
    case 'music':
      ctx.fillRect(x + c + 2, y + 8, 2, 12);
      ctx.beginPath(); ctx.arc(x + c, y + 20, 3.5, 0, Math.PI * 2); ctx.fill();
      break;
    case 'maps':
      ctx.beginPath();
      ctx.moveTo(x + 6, y + s - 7); ctx.lineTo(x + c, y + 7); ctx.lineTo(x + s - 6, y + s - 7);
      ctx.closePath(); ctx.fill();
      break;
  }
  if (label) {
    phoneFont(ctx, 8);
    ctx.fillStyle = PHONE.surface;
    const lw = ctx.measureText(label).width;
    ctx.fillText(label, x + (s - lw) / 2, y + s + 3);
  }
}

/** ⚑ the DOCK: the strip a phone keeps pinned across every page. Another thing
 *  that reads as "phone" before a single label is read. */
export function dock(ctx: CanvasRenderingContext2D, W: number, H: number): number {
  const h = 46; const y = H - h;
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = PHONE.surface;
  ctx.fillRect(0, y, W, h);
  ctx.restore();
  return y;
}

/** the page indicator — two dots, one lit. A phone has more than one screen. */
export function pageDots(ctx: CanvasRenderingContext2D, W: number, y: number, n: number, active: number): void {
  const gap = 8;
  const startX = Math.round((W - (n * 4 + (n - 1) * (gap - 4))) / 2);
  for (let i = 0; i < n; i++) {
    ctx.save();
    ctx.globalAlpha = i === active ? 0.95 : 0.4;
    ctx.fillStyle = PHONE.surface;
    ctx.beginPath(); ctx.arc(startX + i * gap, y, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

/** the at-a-glance card every 2016 home screen had at the top */
export function dateWidget(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, weekday: string, date: string, note: string
): void {
  ctx.save();
  ctx.globalAlpha = 0.9;
  roundRect(ctx, x, y, w, 46, 6, PHONE.surface);
  ctx.restore();
  phoneFont(ctx, 9, 600);
  ctx.fillStyle = PHONE.dim;
  ctx.fillText(weekday.toUpperCase(), x + 10, y + 7);
  phoneFont(ctx, 19, 600);
  ctx.fillStyle = PHONE.ink;
  ctx.fillText(date, x + 10, y + 17);
  phoneFont(ctx, 9);
  ctx.fillStyle = PHONE.dim;
  const nw = ctx.measureText(note).width;
  ctx.fillText(note, x + w - 10 - nw, y + 30);
}

/** the home screen's wallpaper: three soft bands and a low glow, so the icons
 *  sit on something rather than on a flat plate. */
export function wallpaper(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  ctx.fillStyle = PHONE.wallTop; ctx.fillRect(0, 0, W, Math.round(H * 0.42));
  ctx.fillStyle = PHONE.wallMid; ctx.fillRect(0, Math.round(H * 0.42), W, Math.round(H * 0.3));
  ctx.fillStyle = PHONE.wallBot; ctx.fillRect(0, Math.round(H * 0.72), W, H - Math.round(H * 0.72));
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = PHONE.surface;
  for (let r = Math.round(W * 0.7); r > 0; r -= Math.round(W * 0.12)) {
    ctx.beginPath(); ctx.arc(W * 0.72, H * 0.62, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** ⚑ the modal SHEET, up from the bottom edge — the shape a phone of this
 *  period used for anything it wanted you to acknowledge. Returns the y the
 *  sheet's content starts at. */
export function sheet(ctx: CanvasRenderingContext2D, W: number, H: number, h: number): number {
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = PHONE.ink;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const y = H - h;
  roundRect(ctx, 0, y, W, h + 14, 14, PHONE.surface);
  ctx.fillStyle = PHONE.sheetGrip;
  ctx.fillRect(Math.round(W / 2) - 14, y + 7, 28, 3);
  return y + 18;
}

/** a full-width pill button, the only button shape a sheet ever has */
export function pill(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string
): void {
  roundRect(ctx, x, y, w, h, Math.round(h / 2), PHONE.tint);
  phoneFont(ctx, 12, 600);
  ctx.fillStyle = PHONE.tintInk;
  const lw = ctx.measureText(label).width;
  ctx.fillText(label, x + (w - lw) / 2, y + Math.round((h - 14) / 2));
}
