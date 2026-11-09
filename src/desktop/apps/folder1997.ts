/**
 * ⚑ S274 — THE "1997" FOLDER (DESIGN_MISSING_YEARS_2026-10-31.md §2a; his yes, 31 Oct). 2003 begins six years after
 * the night before New Morning, and the piece never shows the fourteen days or the years after. Daniel's own folder
 * carries them: a postcard he never posted, a developed roll (its 27th frame), the certificate with Caleb's line on
 * the back, a cassette's card, his room in 1999. Register: FELT — no Lamby, nothing filed, no witness line.
 * Pictures are drawn here in the ERA1 sixteen: places and objects, never a face, never a programme interior
 * (frame 27 is a door ajar and corridor light, the rule seen from inside, not the room). Text: folder1997.json.
 */
import { ERA1 } from '../theme/era1';
import * as ui from '../theme/chrome';
import { ledger } from '../../state/ledger';
import F from '../../../data/strings/folder1997.json';
import { drawFootage } from './testimony';

/** ⚑ S339 (T41, his 8 Nov: "this is really difficult to read") — the pictures are painted at three times their
 *  logical size, so the writing in them (the postcard, the certificate, the tape's card) is drawn as text at full
 *  resolution instead of being blown up from 9 px; the shapes stay on the logical pixel grid */
const ART_SCALE = 3;
/** ⚑ S339 — the upload of his story (s, 56k) */
const UPLOAD_SECONDS = 4.5;

interface Hit { x: number; y: number; w: number; h: number; id: string }
type View = 'list' | 'card' | 'roll' | 'frame27' | 'certificate' | 'jcard' | 'room' | 'story';

const DW = 420, DH = 300;
const PW = 200, PH = 130;   // a picture's own size, in logical px

export class Folder1997App {
  open = true;
  dirty = true;
  onClose?: () => void;
  private view: View = 'list';
  private back = false;   // the certificate's reverse
  private hover = '';
  hits: Hit[] = [];
  private art = new Map<string, HTMLCanvasElement>();
  /** ⚑ S339 (his answer 8; T45/T49) — the programme saved his story here; he sends it from here */
  storyReady = false;
  private uploadT = -1;
  private uploadedDone = false;
  /** os.ts: the upload finished — his page is next */
  onUploaded?: () => void;
  private t = 0;
  update(dt: number): void {
    this.t += dt;
    if (this.uploadT >= 0 && !this.uploadedDone) {
      this.uploadT += dt; this.dirty = true;
      if (this.uploadT >= UPLOAD_SECONDS) { this.uploadedDone = true; this.onUploaded?.(); }
    }
  }
  /** the files the list shows — his story first, once there is one */
  private files(): { id: string; name: string; caption: string }[] {
    return this.storyReady ? [F.story, ...F.files] : F.files;
  }

  private picture(key: string, draw: (g: CanvasRenderingContext2D) => void): HTMLCanvasElement {
    let cv = this.art.get(key);
    if (!cv) {
      cv = document.createElement('canvas'); cv.width = PW * ART_SCALE; cv.height = PH * ART_SCALE;
      const g = cv.getContext('2d');
      if (g) { g.imageSmoothingEnabled = false; g.scale(ART_SCALE, ART_SCALE); draw(g); }
      this.art.set(key, cv);
    }
    return cv;
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.hits = [];
    const dx = Math.round((W - DW) / 2), dy = Math.max(4, Math.round((H - DH) / 2) - 10);
    const c = ui.windowFrame(ctx, dx, dy, DW, DH, F.title, true);
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.white);
    this.hits.push({ ...c.closeBox, id: 'f97-close' });
    if (this.view === 'list') { this.drawList(ctx, c); return; }
    if (this.view === 'story') { this.drawStory(ctx, c); return; }
    const file = F.files.find((f) => f.id === (this.view === 'frame27' ? 'roll' : this.view));
    const img = this.image(this.view);
    const S = 2, iw = PW * S - 40, ih = PH * S - 52;   // shown a little under ×2, nearest-neighbour
    const ix = c.x + Math.round((c.w - iw) / 2), iy = c.y + 8;
    ui.px(ctx, ix - 2, iy - 2, iw + 4, ih + 4, ERA1.grey);
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, ix, iy, iw, ih);
    ctx.imageSmoothingEnabled = smooth;
    ui.setFont(ctx, 11); ctx.fillStyle = ERA1.black;
    ctx.fillText(this.view === 'frame27' ? F.roll.frame27 : `${file?.name ?? ''}: ${file?.caption ?? ''}`, c.x + 10, iy + ih + 6);
    const by = c.y + c.h - 24;
    this.button(ctx, c.x + 10, by, 64, F.back, 'f97-back');
    if (this.view === 'certificate' || this.view === 'card') this.button(ctx, c.x + c.w - 90, by, 80, F.turn, 'f97-turn');
    if (this.view === 'roll') {
      this.button(ctx, c.x + c.w - 110, by, 100, F.open27, 'f97-27');
      // the 27th frame on the sheet is pressable too (bottom right of the strip)
      const fx = ix + Math.round((26 % 9) * (PW / 9) * (iw / PW)), fy = iy + Math.round(Math.floor(26 / 9) * (PH / 3) * (ih / PH));
      this.hits.push({ x: fx, y: fy, w: Math.round(iw / 9), h: Math.round(ih / 3), id: 'f97-27' });
    }
  }

  private button(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, label: string, id: string): void {
    ui.button(ctx, x, y, w, 18, label, { hover: this.hover === id });
    this.hits.push({ x, y, w, h: 18, id });
  }

  private drawList(ctx: CanvasRenderingContext2D, c: ui.ContentRect): void {
    // a 2003 folder in thumbnail view: five pictures, the card first (his option (b): the song brings you here);
    //   ⚑ S339 — and, once the programme has saved it, his story before them
    this.files().forEach((f, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = c.x + 14 + col * 132, y = c.y + 10 + row * (this.storyReady ? 92 : 118);
      const tw = 100, th = this.storyReady ? 58 : 65;
      const on = this.hover === `f97-open:${f.id}`;
      ui.px(ctx, x - 3, y - 3, tw + 6, th + 6, on ? ERA1.titleBlue : ERA1.silver);
      const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
      if (f.id === 'story') {
        drawFootage(ctx, 'daniel', 9, x, y, tw, th, 0, true);
        ui.px(ctx, x + tw / 2 - 10, y + th / 2 - 8, 20, 16, ERA1.black);
        for (let r = 0; r < 10; r++) ui.px(ctx, x + tw / 2 - 3, y + th / 2 - 5 + r, Math.round(8 * (1 - Math.abs(r - 5) / 5)) + 1, 1, ERA1.white);
        if (!this.uploadedDone) { ui.px(ctx, x + tw - 26, y + 2, 24, 11, ERA1.warn); ui.setFont(ctx, 8); ctx.fillStyle = ERA1.white; ctx.fillText(F.storyNew, x + tw - 24, y + 3); }
      } else ctx.drawImage(this.image(f.id as View), x, y, tw, th);
      ctx.imageSmoothingEnabled = smooth;
      ui.setFont(ctx, 10); ctx.fillStyle = ERA1.black;
      const tw2 = ctx.measureText(f.name).width;
      ctx.fillText(f.name, Math.round(x + tw / 2 - tw2 / 2), y + th + 8);
      this.hits.push({ x: x - 3, y: y - 3, w: tw + 6, h: th + 22, id: `f97-open:${f.id}` });
    });
  }

  /** ⚑ S339 — his story, as a file: the still, its name, and the one thing to do with it */
  private drawStory(ctx: CanvasRenderingContext2D, c: ui.ContentRect): void {
    const iw = 320, ih = 180, ix = c.x + Math.round((c.w - iw) / 2), iy = c.y + 8;
    ui.px(ctx, ix - 2, iy - 2, iw + 4, ih + 4, ERA1.grey);
    drawFootage(ctx, 'daniel', 9, ix, iy, iw, ih, 0, true);
    ui.setFont(ctx, 11); ctx.fillStyle = ERA1.black;
    ctx.fillText(`${F.story.name}: ${F.story.caption}`, c.x + 10, iy + ih + 6);
    const by = c.y + c.h - 24;
    if (this.uploadT < 0) {
      this.button(ctx, c.x + 10, by, 64, F.back, 'f97-back');
      ui.setFont(ctx, 10);
      const uw = Math.ceil(ctx.measureText(F.upload).width) + 24;
      ui.button(ctx, c.x + c.w - uw - 10, by - 2, uw, 22, F.upload, { hover: this.hover === 'f97-upload', primary: true });
      this.hits.push({ x: c.x + c.w - uw - 10, y: by - 2, w: uw, h: 22, id: 'f97-upload' });
      return;
    }
    // the upload, at 56k: a bar of blocks and the bytes
    const k = Math.min(1, this.uploadT / UPLOAD_SECONDS);
    const bw = c.w - 20, bx = c.x + 10, byy = by - 14;
    ui.setFont(ctx, 10); ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(this.uploadedDone ? F.uploaded : F.uploading.replace('{p}', String(Math.floor(k * 100))), bx, byy - 14);
    ui.px(ctx, bx - 1, byy - 1, bw + 2, 14, ERA1.greyDark);
    ui.px(ctx, bx, byy, bw, 12, ERA1.white);
    const blocks = Math.floor((bw / 9) * k);
    for (let i = 0; i < blocks; i++) ui.px(ctx, bx + 1 + i * 9, byy + 1, 7, 10, ERA1.navy);
  }

  private image(view: View): HTMLCanvasElement {
    switch (view) {
      case 'card': return this.back ? this.picture('card-front', drawCardFront) : this.picture('card', drawCard);
      case 'roll': return this.picture('roll', drawRoll);
      case 'frame27': return this.picture('frame27', drawFrame27);
      case 'certificate': return this.back ? this.picture('cert-back', drawCertBack) : this.picture('cert-front', drawCertFront);
      case 'jcard': return this.picture('jcard', drawJCard);
      default: return this.picture('room', drawRoom);
    }
  }

  handleMove(x: number, y: number): void {
    const h = [...this.hits].reverse().find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    const id = h ? h.id : '';
    if (id !== this.hover) { this.hover = id; this.dirty = true; }
  }

  handleClick(x: number, y: number): void {
    const h = [...this.hits].reverse().find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    if (!h) return;
    this.dirty = true;
    // ⚑ S339 (his answer 8: "Closing a file in the 1997 folder returns to the folder's file list, not the preview") —
    //   the X on an open file puts the file down; on the list it closes the folder
    if (h.id === 'f97-close') {
      if (this.view !== 'list' && this.uploadT < 0) { this.view = 'list'; this.back = false; return; }
      this.open = false; this.onClose?.(); return;
    }
    if (h.id === 'f97-upload') { if (this.uploadT < 0) this.uploadT = 0; return; }
    if (h.id === 'f97-back') { this.view = this.view === 'frame27' ? 'roll' : 'list'; this.back = false; return; }
    if (h.id === 'f97-turn') { this.back = !this.back; return; }
    if (h.id === 'f97-27') { this.view = 'frame27'; return; }
    if (h.id.startsWith('f97-open:')) { this.view = h.id.slice(9) as View; this.back = false; }
  }
}

// (S339) the story view lives on the class above — see drawStory
// ── the pictures (ERA1 sixteen, integer rects) ──────────────────────────────
// ⚑ S275 (his: "improve the content images of the 1997 folder") — scanned-photo texture (an ordered dither of two
//   palette colours), more to each picture; still places and objects only, never a face, never a programme interior
//   beyond frame 27's door

const px = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string): void => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const text = (g: CanvasRenderingContext2D, s: string, x: number, y: number, c: string, size = 9, italic = false): void => {
  g.font = `${italic ? 'italic ' : ''}${size}px "Courier New", monospace`; g.textBaseline = 'top'; g.fillStyle = c; g.fillText(s, Math.round(x), Math.round(y));
};
/** a 2×2 ordered dither of two colours — the grain of a cheap scan */
const dither = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, a: string, b: string, density = 2): void => {
  px(g, x, y, w, h, a);
  g.fillStyle = b;
  for (let yy = 0; yy < h; yy++) for (let xx = (yy % 2); xx < w; xx += density) g.fillRect(Math.round(x + xx), Math.round(y + yy), 1, 1);
};
/** a pine: a stepped triangle on a trunk (never a cross) */
const pine = (g: CanvasRenderingContext2D, x: number, base: number, h: number, c: string): void => {
  const rows = Math.max(3, Math.round(h * 0.8));
  for (let r = 0; r < rows; r++) { const w = 1 + Math.floor(r / 2) * 2; px(g, x - Math.floor(w / 2), base - h + r, w, 1, c); }
  px(g, x, base - h + rows, 1, Math.max(1, h - rows), ERA1.olive);
};
const scanLines = (g: CanvasRenderingContext2D): void => { g.globalAlpha = 0.1; for (let y = 3; y < PH; y += 23) px(g, 0, y, PW, 1, ERA1.white); g.globalAlpha = 1; };

/** the postcard's message side: ruled for an address that was never written; stamped, never franked */
function drawCard(g: CanvasRenderingContext2D): void {
  px(g, 0, 0, PW, PH, ERA1.greyDark);
  dither(g, 8, 8, PW - 16, PH - 16, ERA1.paper, ERA1.white, 3);
  px(g, PW / 2, 16, 1, PH - 32, ERA1.silver);
  // the stamp: perforated edge, a lake and a pine
  px(g, PW - 42, 14, 28, 32, ERA1.white);
  for (let i = 0; i < 7; i++) { px(g, PW - 42 + i * 4, 14, 2, 1, ERA1.paper); px(g, PW - 42 + i * 4, 45, 2, 1, ERA1.paper); }
  px(g, PW - 39, 17, 22, 26, ERA1.titleBlue); px(g, PW - 39, 32, 22, 11, ERA1.teal); px(g, PW - 31, 21, 6, 12, ERA1.ok); px(g, PW - 29, 33, 2, 3, ERA1.olive);
  F.card.message.forEach((l, i) => text(g, l, 13, 16 + i * 14, ERA1.navy, 8, true));
  text(g, F.card.to, PW / 2 + 10, 54, ERA1.navy, 11, true);
  for (let i = 0; i < 3; i++) px(g, PW / 2 + 8, 76 + i * 14, PW / 2 - 24, 1, ERA1.silver);
  F.card.address.forEach((l, i) => text(g, l, PW / 2 + 10, 66 + i * 12, ERA1.grey, 7, true));
  scanLines(g);
}
/** the postcard's picture side: a lake at evening, the shop's printed greeting */
function drawCardFront(g: CanvasRenderingContext2D): void {
  dither(g, 0, 0, PW, 60, ERA1.titleBlue, ERA1.silver, 4);           // a hazy sky
  dither(g, 0, 50, PW, 12, ERA1.olive, ERA1.tealDark, 2);           // the far trees
  for (let i = 0; i < 14; i++) pine(g, 6 + i * 14, 58, 16 + (i % 3) * 5, ERA1.tealDark);
  dither(g, 0, 62, PW, PH - 62, ERA1.teal, ERA1.titleBlue, 3);       // the water
  for (let i = 0; i < 6; i++) px(g, 20 + i * 30, 72 + (i % 3) * 9, 14, 1, ERA1.white);   // light on it
  px(g, 120, 84, 60, 4, ERA1.olive); for (let i = 0; i < 4; i++) px(g, 124 + i * 15, 88, 2, 14, ERA1.olive);   // a dock
  px(g, 0, PH - 22, PW, 22, ERA1.white);
  g.font = 'bold 10px "Courier New", monospace'; const w = g.measureText(F.card.front).width;
  text(g, F.card.front, PW / 2 - w / 2, PH - 16, ERA1.warn, 10);
  scanLines(g);
}

/** a contact sheet: 27 exposures — outdoors, what the programme let you photograph; and the 27th */
function drawRoll(g: CanvasRenderingContext2D): void {
  px(g, 0, 0, PW, PH, ERA1.black);
  const fw = PW / 9, fh = PH / 3;
  for (let i = 0; i < 27; i++) {
    const x = Math.round((i % 9) * fw) + 2, y = Math.round(Math.floor(i / 9) * fh) + 6, w = Math.round(fw) - 4, h = Math.round(fh) - 12;
    if (i === 26) { drawFrame27Into(g, x, y, w, h); circle27(g, x, y, w, h); continue; }
    const k = i % 6, horizon = y + Math.round(h * (k === 4 ? 0.4 : 0.58));
    dither(g, x, y, w, horizon - y, k === 5 ? ERA1.warn : ERA1.titleBlue, k === 5 ? ERA1.tooltip : ERA1.silver, 3);   // sky (one at sunset)
    if (k === 0 || k === 3) { dither(g, x, horizon, w, y + h - horizon, ERA1.teal, ERA1.titleBlue, 2); px(g, x + 2, horizon, w - 4, 1, ERA1.white); }   // the lake
    else dither(g, x, horizon, w, y + h - horizon, ERA1.olive, ERA1.ok, 3);   // a field
    if (k === 1) for (let t = 0; t < 3; t++) pine(g, x + 3 + t * 5, horizon + 1, 9, ERA1.tealDark);   // pines
    if (k === 2) { px(g, x + 3, horizon - 6, w - 8, 6, ERA1.white); px(g, x + 4, horizon - 5, 4, 2, ERA1.titleBlue); px(g, x + 4, horizon, 2, 2, ERA1.black); px(g, x + w - 8, horizon, 2, 2, ERA1.black); }   // the white van
    if (k === 3) { px(g, x + w - 9, horizon + 2, 7, 1, ERA1.beige); px(g, x + w - 8, horizon + 3, 1, 3, ERA1.beige); }   // a dock
    if (k === 4) for (let p = 0; p < 4; p++) px(g, x + 1 + p * 4, horizon + 1, 1, 5, ERA1.beige);   // a fence
    if (k === 5) px(g, x + w / 2 - 2, horizon - 3, 4, 3, ERA1.tooltip);   // the sun going
  }
  for (let r = 0; r < 3; r++) for (let s2 = 0; s2 < 18; s2++) {   // the sprockets
    px(g, 2 + s2 * 11, Math.round(r * fh) + 1, 5, 3, ERA1.greyDark);
    px(g, 2 + s2 * 11, Math.round((r + 1) * fh) - 4, 5, 3, ERA1.greyDark);
  }
  for (let i = 0; i < 27; i++) text(g, String(i + 1), Math.round((i % 9) * fw) + 3, Math.round(Math.floor(i / 9) * fh) + Math.round(fh) - 7, ERA1.olive, 5);   // edge numbers
}

/** frame 27: room 3 on the last night, after his Gemini reference (1 Nov: "not clear that is two beds, the perspective
 *  are all off"): a brick back wall and a ceiling light, two brass beds in one-point perspective under blue blankets,
 *  a nightstand and lamp at each, and the door open on the right with the corridor's warm light across the floor.
 *  No one. One vanishing point, centre-right; every shape is a filled polygon in the picture's own 200 × 130 space. */
function drawFrame27Into(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const P = (pts: number[][], c: string): void => {
    g.fillStyle = c; g.beginPath();
    pts.forEach(([u, v], i) => { const X = Math.round(x + u * w), Y = Math.round(y + v * h); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); });
    g.closePath(); g.fill();
  };
  const R = (u: number, v: number, uw: number, vh: number, c: string): void => px(g, Math.round(x + u * w), Math.round(y + v * h), Math.max(1, Math.round(uw * w)), Math.max(1, Math.round(vh * h)), c);
  // the room: ceiling, back wall (brick), left wall, floor — the back wall spans u .14–.78, v .14–.62
  P([[0, 0], [1, 0], [0.78, 0.14], [0.14, 0.14]], ERA1.greyDark);
  P([[0, 0], [0.14, 0.14], [0.14, 0.62], [0, 1]], ERA1.grey);
  P([[0.14, 0.62], [0.78, 0.62], [1, 1], [0, 1]], ERA1.greyDark);
  R(0.14, 0.14, 0.64, 0.48, ERA1.paper);
  for (let r = 0; r < 12; r++) {                                       // the brick courses and their staggered joints
    const vy = 0.14 + r * 0.04; R(0.14, vy, 0.64, 0.004, ERA1.silver);
    for (let c = 0; c < 9; c++) R(0.14 + (c + (r % 2) * 0.5) * 0.072, vy, 0.004, 0.04, ERA1.silver);
  }
  P([[0.42, 0.14], [0.52, 0.14], [0.5, 0.18], [0.44, 0.18]], ERA1.tooltip);   // the ceiling light
  R(0.14, 0.18, 0.64, 0.04, ERA1.beige);                               // its wash on the wall
  // the door, open towards us on the right: the dark doorway, the lit corridor, the leaf
  P([[0.78, 0.14], [1, 0], [1, 1], [0.78, 0.62]], ERA1.black);
  P([[0.86, 0.2], [0.94, 0.16], [0.94, 0.86], [0.86, 0.7]], ERA1.tooltip);
  P([[0.8, 0.18], [0.86, 0.2], [0.86, 0.7], [0.8, 0.64]], ERA1.olive);
  R(0.83, 0.42, 0.012, 0.03, ERA1.beige);                              // the handle
  P([[0.86, 0.7], [0.94, 0.86], [0.7, 0.98], [0.5, 0.86]], ERA1.olive);   // the light across the floor
  for (let i = 0; i < 6; i++) R(0.56 + i * 0.06, 0.88 - i * 0.02, 0.03, 0.012, ERA1.tooltip);
  // two beds, heads against the back wall, feet towards us (one-point perspective)
  const bed = (l: number, r: number, fl: number, fr: number): void => {
    const L = l, Rr = r;                                                // head corners at the wall; foot corners towards us
    R(L - 0.01, 0.4, Rr - L + 0.02, 0.16, ERA1.olive);                  // the brass headboard …
    for (let b = 0; b < 5; b++) R(L + 0.01 + b * (Rr - L - 0.02) / 4, 0.42, 0.008, 0.13, ERA1.tooltip);   // … its rails
    P([[L, 0.56], [Rr, 0.56], [Rr + (fr - Rr) * 0.2, 0.62], [L + (fl - L) * 0.2, 0.62]], ERA1.silver);   // the mattress at the head
    P([[L + 0.025, 0.565], [Rr - 0.025, 0.565], [Rr - 0.02, 0.61], [L + 0.02, 0.61]], ERA1.white);   // the pillow
    const hl = L + (fl - L) * 0.2, hr = Rr + (fr - Rr) * 0.2;
    P([[hl, 0.62], [hr, 0.62], [fr, 0.86], [fl, 0.86]], ERA1.titleBlue);  // the blanket
    P([[hl, 0.62], [hr, 0.62], [hr + (fr - Rr) * 0.1, 0.65], [hl + (fl - L) * 0.1, 0.65]], ERA1.white);   // the sheet turned over it
    P([[fl, 0.86], [fr, 0.86], [fr, 0.92], [fl, 0.92]], ERA1.navy);      // the blanket's fall at the foot
    R(fl, 0.92, fr - fl, 0.02, ERA1.olive);                              // the foot rail
    R(fl, 0.94, 0.01, 0.05, ERA1.olive); R(fr - 0.01, 0.94, 0.01, 0.05, ERA1.olive);   // its legs
  };
  bed(0.23, 0.39, 0.1, 0.34); bed(0.53, 0.69, 0.58, 0.84);   // each bed's foot spreads away from the middle
  // a nightstand and a small lamp beside each bed, against the wall
  for (const u of [0.15, 0.42, 0.7]) {
    if (u === 0.42) continue;   // only at the outer sides, as in the reference
    R(u, 0.5, 0.06, 0.1, ERA1.olive); R(u + 0.005, 0.53, 0.05, 0.004, ERA1.tealDark);
    R(u + 0.02, 0.45, 0.02, 0.05, ERA1.teal); P([[u + 0.01, 0.4], [u + 0.05, 0.4], [u + 0.055, 0.45], [u + 0.005, 0.45]], ERA1.beige);
  }
}
/** S284 — on the contact sheet, frame 27 is circled in red grease pencil: the one somebody marked */
function circle27(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  g.save(); g.strokeStyle = ERA1.warn; g.lineWidth = 2; g.beginPath();
  g.ellipse(x + w / 2, y + h / 2, w / 2 + 3, h / 2 + 3, -0.08, 0, Math.PI * 2); g.stroke(); g.restore();
}
function drawFrame27(g: CanvasRenderingContext2D): void { drawFrame27Into(g, 0, 0, PW, PH); scanLines(g); }

function drawCertFront(g: CanvasRenderingContext2D): void {
  dither(g, 0, 0, PW, PH, ERA1.paper, ERA1.white, 4);
  for (const [o, c] of [[4, ERA1.navy], [7, ERA1.olive]] as [number, string][]) {   // a double rule
    px(g, o, o, PW - 2 * o, 1, c); px(g, o, PH - o - 1, PW - 2 * o, 1, c); px(g, o, o, 1, PH - 2 * o, c); px(g, PW - o - 1, o, 1, PH - 2 * o, c);
  }
  for (let i = 0; i < 4; i++) { const cx = i % 2 ? PW - 14 : 10, cy = i < 2 ? 10 : PH - 14; px(g, cx, cy, 4, 4, ERA1.olive); }   // corner ornaments
  F.certificate.front.forEach((l, i) => {
    const str = l.replace('{name}', ledger.name || 'Daniel');
    const size = i === 0 ? 13 : 8;
    g.font = `${i === 3 ? 'italic ' : ''}${size}px "Courier New", monospace`;
    const w = g.measureText(str).width;
    text(g, str, PW / 2 - w / 2, 12 + (i === 0 ? 0 : 6 + i * 11), i === 0 ? ERA1.navy : i === 3 ? ERA1.warnDark : ERA1.black, size, i === 3);
  });
  px(g, 18, PH - 20, 54, 1, ERA1.grey); px(g, PW - 72, PH - 20, 54, 1, ERA1.grey);   // the staff's lines, signed
  for (let i = 0; i < 9; i++) { px(g, 20 + i * 5, PH - 24 + (i % 2) * 2, 4, 1, ERA1.navy); px(g, PW - 68 + i * 5, PH - 25 + ((i + 1) % 2) * 2, 4, 1, ERA1.navy); }
  px(g, PW / 2 - 9, PH - 34, 18, 18, ERA1.warnDark); px(g, PW / 2 - 7, PH - 32, 14, 14, ERA1.warn); px(g, PW / 2 - 3, PH - 28, 6, 6, ERA1.tooltip);   // the seal
  px(g, PW / 2 - 7, PH - 16, 4, 8, ERA1.warn); px(g, PW / 2 + 3, PH - 16, 4, 8, ERA1.warn);   // its ribbons
  scanLines(g);
}
function drawCertBack(g: CanvasRenderingContext2D): void {
  dither(g, 0, 0, PW, PH, ERA1.paper, ERA1.beige, 5);
  px(g, 0, 0, PW, 3, ERA1.silver);
  px(g, PW - 30, 8, 22, 5, ERA1.tooltip);                           // a scrap of tape
  F.certificate.back.forEach((l, i) => text(g, l, 26, 20 + i * 16, ERA1.navy, 11, true));
  px(g, 26, 20 + 4 * 16 + 14, 40, 1, ERA1.navy);                    // underlined, once
  scanLines(g);
}

/** the J-card from his tape, opened flat in its case, in someone else's hand */
function drawJCard(g: CanvasRenderingContext2D): void {
  dither(g, 0, 0, PW, PH, ERA1.greyDark, ERA1.black, 3);
  px(g, 16, 6, PW - 32, PH - 12, ERA1.silver);                      // the empty case
  px(g, 20, 10, PW - 40, PH - 20, ERA1.white);
  px(g, 20, 10, 18, PH - 20, ERA1.tooltip);                         // the spine
  g.save(); g.translate(32, PH - 14); g.rotate(-Math.PI / 2); text(g, "LAST NIGHT '97", 0, 0, ERA1.warnDark, 8, true); g.restore();
  text(g, F.jcard.title, 44, 13, ERA1.warnDark, 12, true);
  text(g, F.jcard.side, 44, 30, ERA1.grey, 7);
  F.jcard.tracks.forEach((t, i) => text(g, t, 44, 40 + i * 9, ERA1.navy, 8, true));
  px(g, 44, 26, 30, 1, ERA1.warnDark);   // the title, underlined by hand
  scanLines(g);
}

/** his room in 1999, at night: the same window, the desk and the CRT — and a paler shape where the racket hung */
function drawRoom(g: CanvasRenderingContext2D): void {
  dither(g, 0, 0, PW, PH - 34, ERA1.beige, ERA1.silver, 4);
  dither(g, 0, PH - 34, PW, 34, ERA1.olive, ERA1.tealDark, 3);    // the floor
  px(g, 18, 12, 56, 44, ERA1.navy); dither(g, 21, 15, 50, 38, ERA1.navy, ERA1.titleBlue, 4); px(g, 45, 15, 2, 38, ERA1.navy);   // the window, night
  for (const [sx, sy] of [[26, 20], [38, 30], [58, 22], [64, 40], [30, 44]]) px(g, sx, sy, 1, 1, ERA1.white);
  px(g, 12, 56, 68, 3, ERA1.paper);                                  // the sill
  px(g, 90, 62, 100, 5, ERA1.tealDark); px(g, 94, 67, 4, PH - 67 - 34, ERA1.tealDark); px(g, 182, 67, 4, PH - 67 - 34, ERA1.tealDark);   // the desk
  px(g, 116, 28, 48, 34, ERA1.silver); px(g, 120, 32, 40, 24, ERA1.black); dither(g, 122, 34, 36, 20, ERA1.teal, ERA1.tealDark, 3);   // the CRT, a screensaver
  px(g, 132, 56, 16, 6, ERA1.silver);
  px(g, 98, 48, 3, 14, ERA1.olive); px(g, 94, 42, 11, 7, ERA1.tooltip);   // the lamp, on
  px(g, 160, 6, 16, 38, ERA1.paper); px(g, 166, 44, 3, 12, ERA1.paper); px(g, 167, 4, 2, 2, ERA1.greyDark);   // where the racket was, and its nail
  px(g, 0, PH - 50, 30, 16, ERA1.titleBlue); px(g, 0, PH - 52, 32, 3, ERA1.white);   // the bed's corner
  scanLines(g);
}
