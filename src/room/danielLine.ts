/**
 * ⚑ S401 (UiB job 29 D3) — AT DANIEL'S DESK, THEN THE CLOSE. Sérgio, 16 Nov (B11): "I think it would work beautifully when
 * we arrive at the desk of Daniel at the end, and we see that text and the space transforms to the close".
 *
 * ⚑ S404 (UiB job 30 C3) — FOUR LINES, EACH IN ITS OWN TIME'S LOOK. His 18 Nov: "I would say CRT, but the design of the Text
 * should be more aesthetical"; "can we have a message for each stotyr line in diferent styles of the time shown on the
 * CRT? in a way of dialoging with all the story lines"; "they can be sad, but self affirming when all combined, because
 * reality it is sad"; on the third draft, "YES, this is much much better!". The system had a different word for each
 * person and each refuses it in their own story (docs/reinterp/UIB_JOB_30_2026-11-17.md C1): Vera's love was
 * "dependency", Maya was to be "restored", Daniel was "broken". Each line stays inside its own story; nothing here
 * mirrors one onto another.
 *
 * At the end of 2026 the crossing lands at Daniel's seat (app.ts `advanceClose`, the `line` stage between the travel and
 * the eyes rising). His monitor stands on the desk again where it stood in 1997 — the CRT the Close keeps in its row as
 * his machine (S380, closeCrt.ts: the same boxes, the same glass) — dark. On its black glass, one after another, each
 * line as it was met, in the piece's own surfaces:
 *   1. a small "2016" — Vera's phone Notes: the app's bar and her newest note (s3_maiden.json notes `refusal`);
 *   2. a small "2026" — Maya's own message box, the line in it, marked not sent, its send button grey (s4_v3.json
 *      bot.unsent);
 *   3. a small "2003" — the Messenger's window (its title bar bare: his 18 Nov call c), Daniel's bubble (s2_caleb.json `residue.line`, Sérgio's ⟨S⟩ wording,
 *      VERBATIM and on one row: the type is sized to fit, never re-wrapped);
 *   4. no year — Caleb's answer arrives in the same window (`residue.answer`), a little larger, and stays longest.
 * No names (his 5): no nicks, no "says:", no labels; only the years. Daniel and Caleb come last because it is Daniel's
 * desk, and because Caleb's "d." straight after Maya's line would read as said to her. The cards zigzag down the glass —
 * right, left, then the window, whose own bubbles keep the Messenger's sides (his on the right, Caleb's on the left) —
 * so the eye goes right, left, right, left. Each card is drawn in by the tube, top to bottom, in about a third of a
 * second (no fade); the tube's curve, its faint scan lines and its glow lie over all of it. No sound, no Lamby, no frame.
 * Colours from the eras' own palettes only (ERA1, PHONE, V3).
 *
 * It is brought before the eye in every look-mode, in heldDevice's grammar (teachingTv.ts `take`): the pose fixed at the
 * moment it begins, face on, top up, along a curve that keeps its distance from the head; in a headset `xrDist` before
 * the eyes, never a conducted turn, never a fade; on a computer at the distance where the whole case fills `flatFill` of
 * the view's height (never more than `flatMaxW` of its width); ⚑ S404 — and where that would leave the glass narrower than
 * `glassMinPx` CSS pixels (a phone), closer, until the glass is that wide or fills `glassFill` of the view (the case may
 * then run past the frame's sides: the four lines must be read). Timings (data/strings/close_line.json): the residue's
 * own `arriveSeconds` of dark, then the lift; the cards at `cardAt` seconds after the lift began, each drawn in over
 * `reveal`; the last held `holdLast`; then it goes back to the desk and the room becomes the Close as it always has. The
 * engine hides it when the lights go (`hide`). Two draw calls (the body, the glass), for these seconds only; the glass is
 * drawn about twenty times (each card's few reveal steps), never per frame.
 */
import * as pc from 'playcanvas';
import { buildCloseCrt, type GlassRect } from './closeCrt';
import { ERA1 } from '../desktop/theme/era1';
import { FACES } from '../desktop/theme/fonts';
import { PHONE, phoneFont, phoneWrap, roundRect as phoneRound } from '../desktop/theme/phone';
import { V3, roundRect as v3Round } from '../desktop/theme/era4';
import caleb from '../../data/dialog/s2_caleb.json';
import maiden from '../../data/dialog/s3_maiden.json';
import v3 from '../../data/dialog/s4_v3.json';
import staging from '../../data/strings/close_line.json';

const RESIDUE = caleb.residue as { line: string; answer: string };
const PACE = (caleb.pacing as unknown as { residue: { arriveSeconds: number } }).residue;
const NOTES = (maiden.notes as unknown as { entries: { id?: string; text: string }[] }).entries;
const VERA = NOTES.find((e) => e.id === 'refusal')?.text ?? '';
const NOTES_TITLE = (maiden.home as unknown as { fNotes: string }).fNotes;
const UNSENT = (v3.bot as unknown as { unsent: { text: string; mark: string } }).unsent;
const S = staging as unknown as { cards: { year: string | null }[]; cardAt: number[]; reveal: number; holdLast: number;
  liftSeconds: number; xrDist: number; flatFill: number; flatMaxW: number; glassMinPx: number; glassFill: number; clearance: number };
const CARDS = 4;

/** the room's glass centre (app.ts SCREEN; the CRT's own origin), the case (era1.json crtBody) and the glass (closeCrt.ts
 *  GLASS), metres */
const REST = { x: 0, y: 1.08, z: 0 };
const CASE = { w: 0.54, h: 0.44 };
const GLASS = { w: 0.4, h: 0.3 };
const GW = 800, GH = 600;
const D2R = Math.PI / 180;
const smooth = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** a palette colour at an alpha (the colour is the palette's; only its opacity is set) */
function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
/** split at the sentences (these two lines are each two sentences); a sentence too wide still wraps at its spaces */
function sentences(c: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  return text.split(/(?<=[.!?…])\s+/).flatMap((s) => phoneWrap(c, s, maxW));
}

// ── the four surfaces ─────────────────────────────────────────────────────────────────────────────────────────────────
/** the CRT's own type, for the years (the machine's bitmap face) */
const YEAR_FACE = `24px ${FACES.e1.family}`;
const YEAR_H = 30;
/** Vera's Notes: the phone's sizes ×2.1 */
const NOTE = { bar: 36, title: 20, size: 27, step: 34, padX: 22, padTop: 14, padBottom: 14, r: 14, minW: 400 };
/** Maya's message box: the composer's own shape at ×2 */
const BOX = { size: 26, step: 33, padX: 26, padTop: 14, row: 40, padBottom: 8, r: 26, minW: 440, mark: 18 };
/** 2003's Messenger: the XP frame and the period's bubbles at ×2 */
const WIN = { bar: 30, frame: 3, inset: 8, gap: 14, pad: 12, danielMax: 30, danielMin: 18, caleb: 34, bubblePadX: 12, bubblePadY: 9 };

interface Layout { x: number; y: number; w: number; h: number }

function noteCard(c: CanvasRenderingContext2D, measureOnly: boolean, at: { x: number; y: number }, maxW: number): Layout {
  phoneFont(c, NOTE.size, 400);
  const rows = sentences(c, VERA, maxW - NOTE.padX * 2);
  const w = Math.min(maxW, Math.max(NOTE.minW, Math.ceil(Math.max(...rows.map((r) => c.measureText(r).width))) + NOTE.padX * 2));
  const h = NOTE.bar + NOTE.padTop + rows.length * NOTE.step + NOTE.padBottom;
  const { x, y } = at;
  if (measureOnly) return { x, y, w, h };
  // the phone's card: its bar (a back chevron, "Notes"), a hairline, the note, the list's hairline under it
  phoneRound(c, x, y, w, h, NOTE.r, PHONE.surface);
  phoneRound(c, x, y, w, NOTE.bar + NOTE.r, NOTE.r, PHONE.bar);
  c.fillStyle = PHONE.surface; c.fillRect(x, y + NOTE.bar, w, NOTE.r);
  c.fillStyle = PHONE.hairline; c.fillRect(x, y + NOTE.bar - 2, w, 2);
  c.strokeStyle = PHONE.tint; c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x + 24, y + 10); c.lineTo(x + 16, y + 18); c.lineTo(x + 24, y + 26); c.stroke();
  phoneFont(c, NOTE.title, 600); c.fillStyle = PHONE.ink;
  c.fillText(NOTES_TITLE, Math.round(x + (w - c.measureText(NOTES_TITLE).width) / 2), y + 8);
  phoneFont(c, NOTE.size, 400); c.fillStyle = PHONE.ink;
  rows.forEach((r, i) => c.fillText(r, x + NOTE.padX, y + NOTE.bar + NOTE.padTop + i * NOTE.step));
  c.fillStyle = PHONE.hairline; c.fillRect(x + NOTE.padX, y + h - 8, w - NOTE.padX * 2, 2);
  return { x, y, w, h };
}

function messageBox(c: CanvasRenderingContext2D, measureOnly: boolean, at: { x: number; y: number }, maxW: number): Layout {
  const face = (size: number): string => `600 ${size}px ${FACES.e4.family}`;
  c.font = face(BOX.size); c.textBaseline = 'top';
  const rows = sentences(c, UNSENT.text, maxW - BOX.padX * 2);
  c.font = face(BOX.mark);
  const markW = 24 + 8 + Math.ceil(c.measureText(UNSENT.mark).width);
  c.font = face(BOX.size);
  const textW = Math.ceil(Math.max(...rows.map((r) => c.measureText(r).width)));
  const w = Math.min(maxW, Math.max(BOX.minW, textW + BOX.padX * 2, 40 + markW + 16 + 34 + BOX.padX * 2));
  const h = BOX.padTop + rows.length * BOX.step + BOX.row + BOX.padBottom;
  const { x, y } = at;
  if (measureOnly) return { x, y, w, h };
  // the composer: her words in it, the ＋ at its foot, the send button grey (it was never pressed), and the mark
  v3Round(c, x, y, w, h, BOX.r, V3.edge);
  v3Round(c, x + 2, y + 2, w - 4, h - 4, BOX.r - 2, V3.page);
  c.fillStyle = V3.ink;
  rows.forEach((r, i) => c.fillText(r, x + BOX.padX, y + BOX.padTop + i * BOX.step));
  const ry = y + h - BOX.padBottom - BOX.row, cy = ry + BOX.row / 2;
  c.fillStyle = V3.ink2; c.fillRect(x + BOX.padX, cy - 2, 20, 4); c.fillRect(x + BOX.padX + 8, cy - 10, 4, 20);
  const sx = x + w - BOX.padX - 34 + 8;
  v3Round(c, sx, cy - 17, 34, 34, 17, V3.grey);
  c.strokeStyle = V3.card; c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(sx + 17, cy + 9); c.lineTo(sx + 17, cy - 8); c.moveTo(sx + 9, cy); c.lineTo(sx + 17, cy - 8); c.lineTo(sx + 25, cy); c.stroke();
  const mx = sx - 14 - markW;
  v3Round(c, mx, cy - 12, 24, 24, 12, V3.danger);
  c.fillStyle = V3.card; c.fillRect(mx + 10, cy - 7, 4, 9); c.fillRect(mx + 10, cy + 4, 4, 4);
  c.font = face(BOX.mark); c.fillStyle = V3.danger;
  c.fillText(UNSENT.mark, mx + 32, cy - Math.round(BOX.mark * 0.6));
  return { x, y, w, h };
}

/** the period's IM bubble: its corners knocked off in two steps (caleb.ts `bubble`, at ×2) */
function bubble(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, edge: string): void {
  c.fillStyle = edge;
  c.fillRect(x + 4, y, w - 8, h); c.fillRect(x, y + 4, w, h - 8); c.fillRect(x + 2, y + 2, w - 4, h - 4);
  c.fillStyle = fill;
  c.fillRect(x + 4, y + 2, w - 8, h - 4); c.fillRect(x + 2, y + 4, w - 4, h - 8);
}

interface WinLayout extends Layout { daniel: Layout; caleb: Layout; danielSize: number }
function chatWindow(c: CanvasRenderingContext2D, measureOnly: boolean, at: { x: number; y: number }, maxW: number, calebK: number): WinLayout {
  const face = (size: number): string => `${size}px ${FACES.e2.family}`;
  const inner = maxW - (WIN.frame + WIN.inset) * 2 - WIN.pad * 2;
  // ⟨S⟩ — his line on ONE row: the largest type that holds it
  let ds = WIN.danielMax;
  for (; ds > WIN.danielMin; ds -= 1) { c.font = face(ds); if (c.measureText(RESIDUE.line).width + WIN.bubblePadX * 2 <= inner) break; }
  c.font = face(ds); c.textBaseline = 'top';
  const dw = Math.ceil(c.measureText(RESIDUE.line).width) + WIN.bubblePadX * 2, dh = ds + WIN.bubblePadY * 2;
  c.font = face(WIN.caleb);
  const cw = Math.ceil(c.measureText(RESIDUE.answer).width) + WIN.bubblePadX * 2, ch = WIN.caleb + WIN.bubblePadY * 2;
  const w = Math.min(maxW, Math.max(dw, cw) + 96 + (WIN.frame + WIN.inset + WIN.pad) * 2);
  const h = WIN.frame + WIN.bar + WIN.inset + WIN.pad + dh + WIN.gap + ch + WIN.pad + WIN.inset + WIN.frame;
  const { x, y } = at;
  const tx = x + WIN.frame + WIN.inset, ty = y + WIN.frame + WIN.bar + WIN.inset, tw = w - (WIN.frame + WIN.inset) * 2;
  const daniel = { x: tx + tw - WIN.pad - dw, y: ty + WIN.pad, w: dw, h: dh };
  const calebB = { x: tx + WIN.pad, y: daniel.y + dh + WIN.gap, w: cw, h: ch };
  const out = { x, y, w, h, daniel, caleb: calebB, danielSize: ds };
  if (measureOnly) return out;
  // 2003's frame (chrome.ts xpFrame at ×2): navy frame, blue bar with its deeper foot and light top edge, red close box
  c.fillStyle = ERA1.navy; c.fillRect(x, y, w, h);
  c.fillStyle = ERA1.beige; c.fillRect(x + WIN.frame, y + WIN.frame + WIN.bar, w - WIN.frame * 2, h - WIN.frame * 2 - WIN.bar);
  c.fillStyle = ERA1.titleBlue; c.fillRect(x + 2, y + 2, w - 4, WIN.bar - 2);
  c.fillStyle = ERA1.navy; c.fillRect(x + 2, y + WIN.bar - 2, w - 4, 4);
  c.fillStyle = alpha(ERA1.white, 0.45); c.fillRect(x + 4, y + 2, w - 8, 3);
  c.fillStyle = ERA1.black; c.fillRect(x, y, 4, 4); c.fillRect(x + w - 4, y, 4, 4);
  // ⚑ his 18 Nov call (c): the bar is bare. No programme's name over Daniel's and Caleb's words (the in-era Messenger keeps
  //   its title, s2_caleb.json `window.title`); only the close box.
  const bx = x + w - 30, by = y + 6;
  c.fillStyle = ERA1.warn; c.fillRect(bx, by, 20, 20); c.fillStyle = ERA1.white; c.fillRect(bx, by, 20, 2);
  c.strokeStyle = ERA1.white; c.lineWidth = 3; c.lineCap = 'butt';
  c.beginPath(); c.moveTo(bx + 6, by + 6); c.lineTo(bx + 14, by + 14); c.moveTo(bx + 14, by + 6); c.lineTo(bx + 6, by + 14); c.stroke();
  // the transcript, white in its grey edge; his bubble on the right (his own), Caleb's on the left
  const th = h - (WIN.frame + WIN.inset) * 2 - WIN.bar;
  c.fillStyle = ERA1.grey; c.fillRect(tx - 2, ty - 2, tw + 4, th + 4);
  c.fillStyle = ERA1.white; c.fillRect(tx, ty, tw, th);
  bubble(c, daniel.x, daniel.y, daniel.w, daniel.h, ERA1.tooltip, ERA1.olive);
  c.font = face(ds); c.fillStyle = ERA1.black;
  c.fillText(RESIDUE.line, daniel.x + WIN.bubblePadX, daniel.y + WIN.bubblePadY);
  if (calebK > 0) {
    c.save(); c.beginPath(); c.rect(calebB.x - 2, calebB.y - 2, calebB.w + 4, Math.ceil((calebB.h + 4) * calebK)); c.clip();
    bubble(c, calebB.x, calebB.y, calebB.w, calebB.h, ERA1.paper, ERA1.titleBlue);
    c.font = face(WIN.caleb); c.fillStyle = ERA1.black;
    c.fillText(RESIDUE.answer, calebB.x + WIN.bubblePadX, calebB.y + WIN.bubblePadY);
    c.restore();
    if (calebK < 1) beam(c, calebB.x, calebB.y + Math.ceil((calebB.h + 4) * calebK), calebB.w);
  }
  return out;
}

/** the tube drawing a card in: a thin bright line at the edge of what is drawn so far */
function beam(c: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  c.fillStyle = alpha(ERA1.white, 0.35); c.fillRect(x, y - 1, w, 2);
}

/** where the three cards stand (measured once per draw; the type is the same each time) */
function place(c: CanvasRenderingContext2D): { note: Layout; box: Layout; win: WinLayout; years: { x: number; y: number }[] } {
  const PADX = 44, GAP = 14;
  const full = GW - PADX * 2;
  const n0 = noteCard(c, true, { x: 0, y: 0 }, Math.min(560, full));
  const b0 = messageBox(c, true, { x: 0, y: 0 }, Math.min(600, full));
  const w0 = chatWindow(c, true, { x: 0, y: 0 }, full, 0);
  const total = (YEAR_H + n0.h) + GAP + (YEAR_H + b0.h) + GAP + (YEAR_H + w0.h);
  let y = Math.max(16, Math.round((GH - total) / 2));
  const note = { ...n0, x: GW - PADX - n0.w, y: y + YEAR_H };
  y = note.y + note.h + GAP;
  const box = { ...b0, x: PADX, y: y + YEAR_H };
  y = box.y + box.h + GAP;
  const win = chatWindow(c, true, { x: GW - PADX - w0.w, y: y + YEAR_H }, full, 0);
  return { note, box, win, years: [{ x: note.x + 4, y: note.y - YEAR_H + 2 }, { x: box.x + 4, y: box.y - YEAR_H + 2 }, { x: win.x + 4, y: win.y - YEAR_H + 2 }] };
}

/** the glass: the tube's black and its glow, the cards shown so far (the newest drawn in to `k`), the tube's curve over all.
 *  Exported for the probes (tools/s404-crt-probe.mjs `--glass`): the glass alone, at any card. */
export function drawLineGlass(c: CanvasRenderingContext2D, shown: number, k: number): GlassRect {
  c.clearRect(0, 0, GW, GH);
  c.fillStyle = ERA1.black; c.fillRect(0, 0, GW, GH);
  const glow = c.createRadialGradient(GW / 2, GH / 2, 8, GW / 2, GH / 2, Math.max(GW, GH) * 0.62);
  glow.addColorStop(0, alpha(ERA1.navy, 0.22)); glow.addColorStop(1, alpha(ERA1.navy, 0));
  c.fillStyle = glow; c.fillRect(0, 0, GW, GH);
  if (shown > 0) {
    const L = place(c);
    const yearOf = (i: number): void => {
      const year = S.cards[i]?.year;
      if (!year) return;
      c.font = YEAR_FACE; c.textBaseline = 'top'; c.fillStyle = ERA1.grey;
      c.fillText(year, L.years[i].x, L.years[i].y);
    };
    /** card i, drawn in to `kk` of its height (top to bottom), its year with it */
    const card = (i: number, kk: number, draw: () => Layout): void => {
      const r = i === 0 ? L.note : i === 1 ? L.box : L.win;
      c.save(); c.beginPath(); c.rect(r.x - 4, r.y - YEAR_H, r.w + 8, Math.ceil((r.h + YEAR_H + 4) * kk)); c.clip();
      yearOf(i); draw();
      c.restore();
      if (kk < 1) beam(c, r.x, r.y - YEAR_H + Math.ceil((r.h + YEAR_H + 4) * kk), r.w);
    };
    const kOf = (i: number): number => (i < shown - 1 ? 1 : k);
    card(0, kOf(0), () => noteCard(c, false, L.note, L.note.w));
    if (shown > 1) card(1, kOf(1), () => messageBox(c, false, L.box, L.box.w));
    if (shown > 2) card(2, kOf(2), () => chatWindow(c, false, L.win, L.win.w, shown > 3 ? kOf(3) : 0));
  }
  // the curve: the rim darker where the glass bends away, faint scan lines, one soft highlight up and to the left
  const rim = c.createRadialGradient(GW / 2, GH / 2, Math.min(GW, GH) * 0.46, GW / 2, GH / 2, Math.max(GW, GH) * 0.7);
  rim.addColorStop(0, alpha(ERA1.black, 0)); rim.addColorStop(1, alpha(ERA1.black, 0.32));
  c.fillStyle = rim; c.fillRect(0, 0, GW, GH);
  c.fillStyle = alpha(ERA1.black, 0.07);
  for (let y = 0; y < GH; y += 4) c.fillRect(0, y, GW, 1);
  const hl = c.createLinearGradient(0, 0, GW * 0.45, GH * 0.45);
  hl.addColorStop(0, alpha(ERA1.white, 0.06)); hl.addColorStop(1, alpha(ERA1.white, 0));
  c.fillStyle = hl; c.fillRect(0, 0, GW, GH);   // the whole glass: the gradient ends itself (a quarter rect left an edge)
  return { x: 0, y: 0, w: 0, h: 0 };
}

/** the eye's frame (teachingTv.ts eyeFrame): in a headset level-ish, pitch held between 0 and −30° */
function eyeFrame(eye: pc.Entity, xr: boolean): { fwd: pc.Vec3; up: pc.Vec3 } {
  let fwd = eye.forward.clone(), up = eye.up.clone();
  if (xr) {
    const h = new pc.Vec3(fwd.x, 0, fwd.z);
    if (h.lengthSq() < 1e-6) h.set(-up.x, 0, -up.z);
    h.normalize();
    const pitch = Math.max(-30, Math.min(0, Math.asin(Math.max(-1, Math.min(1, fwd.y))) / D2R)) * D2R;
    fwd = new pc.Vec3(h.x * Math.cos(pitch), Math.sin(pitch), h.z * Math.cos(pitch));
    up = new pc.Vec3(0, 1, 0).sub(fwd.clone().mulScalar(fwd.y)).normalize();
  }
  return { fwd: fwd.normalize(), up: up.normalize() };
}
/** a rotation whose +Z faces the eye (−fwd) and whose +Y is `up` */
function faceRot(fwd: pc.Vec3, up: pc.Vec3): pc.Quat {
  const z = fwd.clone().mulScalar(-1), x = new pc.Vec3().cross(up, z).normalize();
  const y = new pc.Vec3().cross(z, x).normalize();
  const m = new pc.Mat4();
  m.data.set([x.x, x.y, x.z, 0, y.x, y.y, y.z, 0, z.x, z.y, z.z, 0, 0, 0, 0, 1]);
  return new pc.Quat().setFromMat4(m);
}

export type LinePhase = 'off' | 'dark' | 'lift' | 'held' | 'return' | 'rest';

export interface DanielLine {
  readonly entity: pc.Entity;
  readonly phase: LinePhase;
  /** the lines have been read and the monitor is back on the desk */
  readonly done: boolean;
  /** the monitor on the desk, dark; then the lines, brought before `eye` (the pose fixed now). `inPlace`: the room's
   *  own CRT already stands on the desk (the review route `?close=1` begins in 1997's room) — then the lines are on ITS
   *  glass, where the eye already is, and nothing is lifted (two monitors in one place would fight) */
  begin(eye: pc.Entity, xr: boolean, cam: pc.CameraComponent | null, inPlace?: boolean): void;
  tick(dt: number): void;
  /** gone, at once (the lights are out, or the Close was left) */
  hide(): void;
  /** the probes' handle: how many of the four cards are on the glass (0 dark … 4 Caleb's answer), and whether the newest
   *  is fully drawn */
  readonly shown: number;
  readonly drawn: boolean;
}

export function buildDanielLine(app: pc.AppBase): DanielLine {
  let shown = 0, k = 1;
  const crt = buildCloseCrt(app, (c) => drawLineGlass(c, shown, k));
  const entity = crt.entity;
  entity.name = 'daniel-line-crt';
  entity.enabled = false;
  app.root.addChild(entity);
  const restPos = new pc.Vec3(REST.x, REST.y, REST.z), restRot = new pc.Quat();
  const to = { pos: new pc.Vec3(), rot: new pc.Quat() };
  const via = new pc.Vec3();
  /** `tl`: seconds since the lift began (the cards' clock) */
  let phase: LinePhase = 'off', t = 0, tl = 0, still = false;
  const body = entity.findByName('close-crt-body') as pc.Entity | null;
  /** in place: the glass laid on the room's own, just in front of the desktop's (z 0) and behind the bezel's face */
  const IN_PLACE_Z = 0.006;
  /** the reveal in steps (the glass is redrawn a few times per card, never per frame) */
  const STEPS = 4;
  const show = (n: number, kk: number): void => {
    const q = Math.min(1, Math.ceil(kk * STEPS) / STEPS);
    if (n !== shown || q !== k) { shown = n; k = q; crt.redraw(); }
  };
  const lastAt = (): number => S.cardAt[CARDS - 1] + S.holdLast;
  /** the cards for the lift's clock */
  const cardsAt = (time: number): void => {
    let n = 0;
    for (let i = 0; i < CARDS; i++) if (time >= S.cardAt[i]) n = i + 1;
    const kk = n ? Math.min(1, (time - S.cardAt[n - 1]) / Math.max(0.01, S.reveal)) : 1;
    show(n, kk);
  };
  const placeAt = (kk: number, back: boolean): void => {
    const s = smooth(kk), u = 1 - s;
    const a = back ? to.pos : restPos, b = back ? restPos : to.pos;
    entity.setPosition(u * u * a.x + 2 * u * s * via.x + s * s * b.x, u * u * a.y + 2 * u * s * via.y + s * s * b.y,
      u * u * a.z + 2 * u * s * via.z + s * s * b.z);
    const q = new pc.Quat().slerp(back ? to.rot : restRot, back ? restRot : to.rot, s);
    entity.setRotation(q);
  };
  return {
    entity,
    get phase() { return phase; },
    get done() { return phase === 'rest'; },
    get shown() { return shown; },
    get drawn() { return k >= 1; },
    begin(eye, xr, cam, inPlace = false) {
      still = inPlace;
      if (body) body.enabled = !inPlace;
      tl = 0;
      if (inPlace) {
        entity.setPosition(restPos.x, restPos.y, restPos.z + IN_PLACE_Z); entity.setRotation(restRot);
        to.pos.copy(entity.getPosition()); to.rot.copy(restRot); via.copy(to.pos);
        entity.enabled = true; show(0, 1); phase = 'dark'; t = 0;
        return;
      }
      const { fwd, up } = eyeFrame(eye, xr);
      let d: number;
      if (xr) d = Math.max(0.5, S.xrDist);
      else {
        const fov = cam?.fov ?? 42, tanV = Math.tan((fov / 2) * D2R);
        const gd = app.graphicsDevice, aspect = gd.height > 0 ? gd.width / gd.height : 16 / 9;
        d = Math.max(CASE.h / (2 * tanV * S.flatFill), CASE.w / (2 * tanV * aspect * S.flatMaxW));
        // ⚑ S404 — a small view (a phone): closer, until the glass is `glassMinPx` wide or fills `glassFill` of the view
        const cssW = (gd.canvas as HTMLCanvasElement | undefined)?.clientWidth || gd.width;
        const glassPx = (GLASS.w / (2 * d * tanV * aspect)) * cssW;
        if (glassPx < S.glassMinPx) {
          const fill = Math.max(GLASS.h / (2 * tanV * S.glassFill), GLASS.w / (2 * tanV * aspect * S.glassFill));
          d = Math.max(fill, d * glassPx / S.glassMinPx);
        }
      }
      const eyeP = eye.getPosition().clone();
      to.pos.copy(eyeP).add(fwd.clone().mulScalar(d));
      to.rot.copy(faceRot(fwd, up));
      // the curve keeps `clearance` from the eye (from the desk at the side it swings round, never through the head)
      const half = new pc.Vec3().lerp(restPos, to.pos, 0.5), mid = half.clone();
      const away = mid.clone().sub(eyeP);
      if (away.length() < S.clearance) {
        if (away.lengthSq() < 1e-6) away.set(1, 0, 0);
        mid.copy(eyeP).add(away.normalize().mulScalar(S.clearance));
      }
      via.copy(mid).mulScalar(2).sub(half);
      entity.setPosition(restPos); entity.setRotation(restRot);
      entity.enabled = true;
      show(0, 1);
      phase = 'dark'; t = 0;
    },
    tick(dt) {
      if (phase === 'off' || phase === 'rest') return;
      t += dt;
      if (phase === 'dark') {
        if (t >= PACE.arriveSeconds) { phase = 'lift'; t = 0; tl = 0; }
        return;
      }
      if (phase === 'lift' || phase === 'held') { tl += dt; cardsAt(tl); }
      if (phase === 'lift') {
        if (!still) placeAt(Math.min(1, t / S.liftSeconds), false);
        if (still || t >= S.liftSeconds) { phase = 'held'; t = 0; }
      } else if (phase === 'held') {
        if (tl >= lastAt()) { phase = 'return'; t = 0; }
      } else if (phase === 'return') {
        if (!still) placeAt(Math.min(1, t / S.liftSeconds), true);
        if (still || t >= S.liftSeconds) { phase = 'rest'; t = 0; }
      }
    },
    hide() { entity.enabled = false; phase = 'off'; show(0, 1); if (body) body.enabled = true; }
  };
}
