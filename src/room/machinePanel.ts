/**
 * ⚑ S378 (UiB job 20 Part A) — THE COMPUTER AS A PANEL. Daniel's machine joins the Close's row as a fifth panel, between
 * 2026 and 1997 (the ring closes on the machine that carried all four years), and a press anywhere on it opens the
 * machine's own page in the site viewer (src/frame/siteViewer/machine.ts). It replaces the far glass in the sky, whose
 * bare plane caught presses meant for other things (his "phantom clicks").
 *
 * Two faces, drawn into the panels' one atlas (pointCloud.ts — no new draw call):
 *   · `crt` (his suggestion, 12 Nov: "the panel itself can be CRT-inspired — a beige bezel, a curved glass, the tube's
 *     glow"): the panel IS the machine's front — the bezel in the room's own plastic, the glass rounded and glowing, the
 *     machine's mark and its one sentence on it, the badge and the green light on the chin. 4:3, narrower than the rooms'
 *     panels, so it reads as a different kind of thing: not a room, the machine.
 *   · `plate`: the four panels' own grammar — a picture of the machine in the plate well, its line and sentence in the
 *     reading column, the hint and a button bottom right. (`?machinePanel=plate`, for comparison.)
 * Both carry an "Open" button where the rooms' panels carry "Sources": the thing a visitor looks for; the whole panel
 * still answers a press (the headset's wand needs no aim).
 *
 * Words: close_restart.json (the card's mark, years, title and `kept`, unchanged) and its `machine` block (the hint and
 * the button, drafts). Colours: ERA1 and CRT_PLASTIC (the room's own machine, data/room/era1.json) — none invented.
 * Type at the panels' density (698 px a metre at 3.05 m): nothing under 28 px, the Close's floor (S146).
 */
import card from '../../data/strings/close_restart.json';
import { ERA1, CRT_PLASTIC } from '../desktop/theme/era1';
import { FACES } from '../desktop/theme/fonts';

export type MachineFace = 'crt' | 'plate';
export interface CellRect { x: number; y: number; w: number; h: number }
const FACE = FACES.e1.family;
const M = (card as unknown as { machine: { panelHint: string; panelButton: string } }).machine;

/** the machine's front, 4:3 (cell px for the `crt` face: CELL_H × 4/3 wide) */
export const CRT_CELL_W = 1024;

/** wrap at the context's current font */
function wrap(c: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = []; let line = '';
  for (const w of text.split(' ')) {
    const t = line ? `${line} ${w}` : w;
    if (c.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out;
}

/** the 1997 bevelled button, drawn at ×3 like the rooms' Sources buttons (pointCloud.ts drawSourcesButton, era 1) */
function bevelButton(c: CanvasRenderingContext2D, r: CellRect, label: string): void {
  const S = 3, x = r.x, y = r.y, w = r.w, h = r.h;
  c.fillStyle = ERA1.black; c.fillRect(x, y, w, h);
  c.fillStyle = ERA1.white; c.fillRect(x, y, w - S, h - S);
  c.fillStyle = ERA1.greyDark; c.fillRect(x + S, y + S, w - 2 * S, h - 2 * S);
  c.fillStyle = ERA1.silver; c.fillRect(x + S, y + S, w - 3 * S, h - 3 * S);
  c.fillStyle = ERA1.beige; c.fillRect(x + 2 * S, y + 2 * S, w - 4 * S, h - 4 * S);
  c.font = `45px ${FACE}`; c.fillStyle = ERA1.black; c.textBaseline = 'middle'; c.textAlign = 'center';
  c.fillText(label, x + w / 2, y + h / 2 + 2);
  c.textAlign = 'left';
}

/** a rounded rectangle path */
function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

/**
 * THE MACHINE'S FRONT, drawn into `r` (any size, 4:3 or near it). `glass` draws what is on the screen, given the glass
 * rect; returns the glass rect. Shading follows the 3D machine's (closeMonitor.ts FACES): the top lit, the sides darker,
 * the face toward the sky darkest — so it reads whatever the sky's light is doing.
 */
export function drawCrtFront(c: CanvasRenderingContext2D, r: CellRect, glass?: (g: CellRect) => void, night = 0.42): CellRect {
  const k = r.w / CRT_CELL_W;   // all measures at the full face's scale
  const P = CRT_PLASTIC;
  // the case: the bezel, a little rounded, with its top edge catching the light and its foot in shadow
  rr(c, r.x, r.y, r.w, r.h, 22 * k); c.fillStyle = P.body; c.fill();
  c.save(); rr(c, r.x, r.y, r.w, r.h, 22 * k); c.clip();
  c.fillStyle = P.light; c.fillRect(r.x, r.y, r.w, 10 * k);
  c.fillStyle = P.shade; c.fillRect(r.x, r.y + r.h - 14 * k, r.w, 14 * k);
  c.fillRect(r.x + r.w - 10 * k, r.y, 10 * k, r.h);
  c.restore();
  // the recess round the glass: the bezel steps in, darker on its top and left inner faces (light from above)
  const g0 = { x: r.x + 58 * k, y: r.y + 52 * k, w: r.w - 116 * k, h: r.h - 168 * k };
  rr(c, g0.x - 22 * k, g0.y - 22 * k, g0.w + 44 * k, g0.h + 44 * k, 34 * k); c.fillStyle = P.shade; c.fill();
  rr(c, g0.x - 10 * k, g0.y - 10 * k, g0.w + 20 * k, g0.h + 20 * k, 30 * k); c.fillStyle = P.dark; c.fill();
  // the chin: the badge, embossed, and the power button (its green light is lit after the night falls on the case)
  const chinY = g0.y + g0.h + 22 * k + (r.y + r.h - (g0.y + g0.h + 22 * k)) / 2;
  c.font = `${Math.round(40 * k)}px ${FACE}`; c.textBaseline = 'middle';
  c.fillStyle = P.light; c.fillText(card.mark, g0.x + 2 * k, chinY + 2 * k);
  c.fillStyle = P.dark; c.fillText(card.mark, g0.x, chinY);
  const pbx = r.x + r.w - 150 * k;
  c.fillStyle = P.dark; c.fillRect(pbx, chinY - 14 * k, 72 * k, 28 * k);
  c.fillStyle = P.shade; c.fillRect(pbx + 3 * k, chinY - 11 * k, 66 * k, 22 * k);
  // ⚑ the night on the case: the Close has its lights out, and a full-bright beige read as a lamp beside the navy
  //   panels — the case is the room's beige in the dark (the 3D machine's own self-light is ×0.8 of its colour, S174);
  //   only the glass and the green light are lit
  rr(c, r.x, r.y, r.w, r.h, 22 * k); c.fillStyle = hexA(ERA1.black, night); c.fill();
  // the glass: black, its corners rounded the way a tube's are, and its glow — the phosphor's light gathered at the
  // middle and falling off to the edges (the palette's own blue at a low alpha), then the scan lines over it
  rr(c, g0.x, g0.y, g0.w, g0.h, 28 * k); c.fillStyle = ERA1.black; c.fill();
  c.save(); rr(c, g0.x, g0.y, g0.w, g0.h, 28 * k); c.clip();
  const cx = g0.x + g0.w / 2, cy = g0.y + g0.h / 2;
  const glow = c.createRadialGradient(cx, cy, 10 * k, cx, cy, Math.max(g0.w, g0.h) * 0.62);
  glow.addColorStop(0, hexA(ERA1.titleBlue, 0.22)); glow.addColorStop(0.7, hexA(ERA1.navy, 0.10)); glow.addColorStop(1, hexA(ERA1.black, 0));
  c.fillStyle = glow; c.fillRect(g0.x, g0.y, g0.w, g0.h);
  if (glass) glass(g0);
  // the curve: a darker rim (the glass bending away) and one soft highlight up and to the left (the room's lamp in it)
  const rim = c.createRadialGradient(cx, cy, Math.min(g0.w, g0.h) * 0.42, cx, cy, Math.max(g0.w, g0.h) * 0.66);
  rim.addColorStop(0, hexA(ERA1.black, 0)); rim.addColorStop(1, hexA(ERA1.black, 0.55));
  c.fillStyle = rim; c.fillRect(g0.x, g0.y, g0.w, g0.h);
  c.fillStyle = hexA(ERA1.black, 0.16);
  for (let y = g0.y; y < g0.y + g0.h; y += 4 * k) c.fillRect(g0.x, y, g0.w, Math.max(1, 1.5 * k));
  const hl = c.createLinearGradient(g0.x, g0.y, g0.x + g0.w * 0.45, g0.y + g0.h * 0.45);
  hl.addColorStop(0, hexA(ERA1.white, 0.10)); hl.addColorStop(1, hexA(ERA1.white, 0));
  c.fillStyle = hl; c.fillRect(g0.x, g0.y, g0.w * 0.5, g0.h * 0.5);
  c.restore();
  // the power light, lit
  c.fillStyle = ERA1.ok; c.fillRect(pbx - 44 * k, chinY - 8 * k, 20 * k, 16 * k);
  c.fillStyle = hexA(ERA1.white, 0.5); c.fillRect(pbx - 44 * k, chinY - 8 * k, 20 * k, 4 * k);
  return g0;
}

/** a palette colour at an alpha (the colour itself is the palette's; only its opacity is set) */
function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** the `crt` face: the whole cell is the machine's front, its glass carrying the mark, the title, `kept`, the hint and
 *  the Open button. Returns the button's rect (cell px, relative to the cell's top-left). */
export function drawMachineCrtCell(c: CanvasRenderingContext2D, y0: number, W: number, H: number): CellRect {
  c.clearRect(0, y0, W, H);
  let btn: CellRect = { x: 0, y: 0, w: 0, h: 0 };
  drawCrtFront(c, { x: 6, y: y0 + 6, w: W - 12, h: H - 12 }, (g) => {
    const pad = 44, x = g.x + pad, w = g.w - pad * 2;
    c.textBaseline = 'middle';
    // the machine's header line, as on its old card: the mark, and the span it was running
    c.font = `32px ${FACE}`; c.fillStyle = ERA1.silver;
    c.fillText(card.mark, x, g.y + 52);
    const yw = c.measureText(card.years).width;
    c.fillText(card.years, x + w - yw, g.y + 52);
    c.fillStyle = ERA1.greyDark; c.fillRect(x, g.y + 82, w, 3);
    // the title, as large as the glass allows
    let tp = 64;
    for (; tp > 40; tp -= 2) { c.font = `${tp}px ${FACE}`; if (c.measureText(card.title).width <= w) break; }
    c.fillStyle = ERA1.white; c.fillText(card.title, x, g.y + 150);
    // the one sentence that is true of the piece and false of every apparatus in it
    c.font = `34px ${FACE}`; c.fillStyle = ERA1.silver;
    wrap(c, card.kept, w).forEach((l, i) => c.fillText(l, x, g.y + 226 + i * 44));
    // the way in: the button bottom right, the hint beside it
    btn = { x: g.x + g.w - pad - 252, y: g.y + g.h - pad - 78, w: 252, h: 78 };
    bevelButton(c, btn, M.panelButton);
    c.font = `28px ${FACE}`; c.fillStyle = ERA1.tooltip;
    const rows = wrap(c, M.panelHint, btn.x - x - 24);
    rows.forEach((l, i) => c.fillText(l, x, Math.round(btn.y + btn.h / 2 + (i - (rows.length - 1) / 2) * 36)));
  });
  return { x: btn.x, y: btn.y - y0, w: btn.w, h: btn.h };
}

/** the `plate` face: the rooms' grammar — the machine pictured in the plate well, its line and sentence in the column,
 *  the hint and the button bottom right. `ink` carries the panels' own colours (cluster.json) so it sits in their row. */
export function drawMachinePlateCell(c: CanvasRenderingContext2D, y0: number, W: number, H: number,
  ink: { backdrop: string; link: string; label: string; warm: string; readingFace: string; closeFace: string },
  plate: CellRect, btn: CellRect): void {
  c.clearRect(0, y0, W, H);
  c.globalAlpha = 0.9; c.fillStyle = ink.backdrop; c.fillRect(0, y0 + 8, W, H - 16); c.globalAlpha = 1;
  c.fillStyle = ink.link; c.fillRect(0, y0 + 8, W, 5);
  c.fillStyle = ink.backdrop; c.fillRect(plate.x, y0 + plate.y, plate.w, plate.h);
  // the machine, pictured: its front, 4:3, centred in the well, its glass with the title on it
  const fw = plate.w - 40, fh = Math.round(fw * 0.75);
  drawCrtFront(c, { x: plate.x + 20, y: y0 + plate.y + Math.round((plate.h - fh) / 2), w: fw, h: fh }, (g) => {
    c.font = `${Math.round(g.w / 15)}px ${FACE}`; c.fillStyle = ERA1.white; c.textBaseline = 'middle';
    const lines = wrap(c, card.title, g.w - 40);
    lines.forEach((l, i) => c.fillText(l, g.x + 20, g.y + g.h / 2 + (i - (lines.length - 1) / 2) * g.w / 12));
  });
  const tx = plate.x + plate.w + 48, tw = W - tx - 44;
  c.textBaseline = 'middle';
  c.font = `54px ${ink.closeFace}`; c.fillStyle = ink.label;
  c.fillText(`${card.years}  ·  ${card.mark}`, tx, y0 + 96);
  c.font = `34px ${ink.readingFace}`; c.fillStyle = ink.warm;
  wrap(c, `${card.title} ${card.kept}`, tw).forEach((l, i) => c.fillText(l, tx, y0 + 168 + i * 44));
  bevelButton(c, { x: btn.x, y: y0 + btn.y, w: btn.w, h: btn.h }, M.panelButton);
  c.font = `24px ${ink.closeFace}`; c.fillStyle = ink.link;
  const rows = wrap(c, M.panelHint, btn.x - tx - 28);
  rows.forEach((l, i) => c.fillText(l, tx, Math.round(y0 + btn.y + btn.h / 2 + (i - (rows.length - 1) / 2) * 30)));
}
