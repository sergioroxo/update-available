/** Shared balloon grammar with setup; palette and chrome follow the surface. */
import * as ui from '../theme/chrome';
import * as aero from '../theme/era3';
import { ERA1 } from '../theme/era1';
import { ERA3 } from '../theme/era3';
import { CHROME } from '../theme/era4';
import { drawLambyChar } from './lambyChar';
import { reducedMotion } from '../../state/motion';
import type { GuideEra, GuideView } from '../../narrative/lambyGuide';
import copy from '../../../data/strings/lambyGuide.json';
import decisions from '../../../data/strings/cx3b.json';
export interface GuideHit { id: string; x: number; y: number; w: number; h: number; label?: string; tip?: string }
export interface GuidePaint { rings: GuideHit[]; balloon: boolean }
/** Extracted from Lamblippy's tooltip: 1px border and a stepped tail toward the lamb. */
export function drawLambyTooltip(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  ground: string = ERA1.tooltip, tailX = x + w - 36, tail = 6): void {
  ui.px(ctx, tailX, y + h - 1, tail + 2, tail + 1, ERA1.black);
  ui.px(ctx, tailX + 1, y + h - 1, tail, tail, ground);
  ui.px(ctx, x, y, w, h, ERA1.black); ui.px(ctx, x + 1, y + 1, w - 2, h - 2, ground);
}
/** No smooth travel: three discrete 1px rings and an orthogonal pixel arrow. */
export function drawGuidePointer(ctx: CanvasRenderingContext2D, r: GuideHit, from: { x: number; y: number }, colour: string, frame: number): GuideHit {
  const p = reducedMotion() ? 0 : frame;
  const ring = { ...r, x: r.x - p, y: r.y - p, w: r.w + 2 * p, h: r.h + 2 * p };
  ui.px(ctx, ring.x, ring.y, ring.w, 1, colour); ui.px(ctx, ring.x, ring.y + ring.h - 1, ring.w, 1, colour);
  ui.px(ctx, ring.x, ring.y, 1, ring.h, colour); ui.px(ctx, ring.x + ring.w - 1, ring.y, 1, ring.h, colour);
  const tx = Math.round(r.x + r.w / 2), ty = Math.round(r.y + r.h / 2);
  const fy = from.y < r.y ? r.y - 6 : r.y + r.h + 6;
  ui.px(ctx, Math.min(from.x, tx), from.y, Math.abs(from.x - tx) + 1, 1, colour);
  ui.px(ctx, tx, Math.min(from.y, fy), 1, Math.abs(from.y - fy) + 1, colour);
  const dir = ty > fy ? 1 : -1;
  for (let n = 0; n < 4; n++) ui.px(ctx, tx - n, fy - dir * n, 2 * n + 1, 1, colour);
  return ring;
}
export function drawLambyGuide(ctx: CanvasRenderingContext2D, skin: GuideEra, state: GuideView, hits: GuideHit[], size = { w: 512, h: 384 }, remoteActions: string[] = []): GuidePaint {
  const out: GuidePaint = { rings: [], balloon: false };
  if (state.era !== skin) return out;
  const W = size.w, H = size.h, tx = W - (skin === 'e3' ? 182 : 108), ty = H - 20;
  const accent = skin === 'e3' ? ERA3.accent : skin === 'e4' ? CHROME.accent : ERA1.navy;
  const ink = skin === 'e4' ? CHROME.ink : skin === 'e3' ? ERA3.ink : ERA1.black;
  const ground = skin === 'e4' ? CHROME.field : skin === 'e3' ? ERA3.glass : skin === 'e2' ? ERA1.paper : ERA1.tooltip;
  // A head in the tray; cue lifts it by one pixel. Uses the same character, cropped to its head.
  if (skin === 'e3') { ui.px(ctx, tx - 2, ty - 3, 64, 21, ERA3.tray); ui.px(ctx, tx - 2, ty - 3, 64, 1, ERA3.glassEdge); }
  const headY = ty + 8 - (state.rung === 'cue' ? state.frame % 2 : 0);
  ctx.save(); ctx.beginPath(); ctx.rect(tx, ty - 3, 20, 21); ctx.clip();
  if (skin === 'e4') { ui.setFont(ctx, 16); ctx.fillStyle = accent; ctx.fillText(decisions.helper.e4, tx + 5, ty); }
  else if (skin === 'e3') aero.drawLambMark(ctx, tx + 10, headY, 0.55);
  else drawLambyChar(ctx, tx + 10, headY + 4, { mood: 'cheerful', action: 'idle', scale: 0.24, headOnly: true, t: state.rung === 'cue' ? state.time : 0, moodStart: 0 }); ctx.restore();
  ui.setFont(ctx, 9); ctx.fillStyle = skin === 'e3' ? ERA3.white : ink; if (skin !== 'e4') ctx.fillText(decisions.helper[skin], tx + 22, ty + 5);
  hits.push({ id: 'lg-tray', label: decisions.helper[skin], tip: state.hidden ? undefined : copy.ui.trayTip, x: tx, y: ty - 3, w: 60, h: 21 });
  if (state.hidden || !state.text) return out;
  out.balloon = true;
  const targets = state.targets.flatMap(id => hits.filter(h => h.id === id));
  const multiple = state.beat === 'pledge' || state.beat === 'consent' || state.beat === 'steps';
  const selected = multiple ? targets : targets.slice(0, 1);
  const pointing = state.rung === 'show' || state.rung === 'start';
  const w = Math.min(272, W - 8), x = W - w - 4;
  ui.setFont(ctx, 11);
  const h = Math.max(112, 58 + ui.wrapText(ctx, state.text, w - (skin === 'e4' ? 66 : 36)).length * 15);
  let y = W < 300 ? 2 : H - 22 - h - 70;
  if (pointing && selected.some(r => r.x < x + w && r.x + r.w > x && r.y < y + h && r.y + r.h > y)) y = 26;
  const cx = skin === 'e3' ? tx + 10 : W - 48, cy = H - 59;
  if (skin === 'e1' || skin === 'e2') drawLambyChar(ctx, cx, cy, { mood: 'cheerful', action: pointing ? 'point' : 'idle', scale: 0.48, t: state.frame / 3, moodStart: 0 });
  if (pointing) for (const r of selected) out.rings.push(drawGuidePointer(ctx, r, skin === 'e3' ? { x: cx, y: ty - 4 } : { x: cx - 26, y: cy }, accent, state.frame));
  if (skin === 'e1' || skin === 'e2') drawLambyTooltip(ctx, x, y, w, h, ground);
  else {
    const edge = skin === 'e3' ? ERA3.glassEdge : CHROME.fieldEdge;
    ui.px(ctx, x, y, w, h, edge); ui.px(ctx, x + 1, y + 1, w - 2, h - 2, ground);
    ui.px(ctx, x + 1, y + 1, w - 2, 2, accent);
    const tailX = Math.max(x + 8, Math.min(x + w - 8, cx - 3));
    ui.px(ctx, tailX, y + h, 6, 6, edge); ui.px(ctx, tailX + 1, y + h - 1, 4, 6, ground);
  }
  let textX = x + 12, textW = w - 36;
  if (skin === 'e4') {
    ui.setFont(ctx, 18); ctx.fillStyle = accent; ctx.fillText(decisions.helper.e4, x + 16, y + 14);
    textX += 30; textW -= 30;
  }
  ui.setFont(ctx, 11); ctx.fillStyle = ink;
  ui.wrapText(ctx, state.text, textW).forEach((line, i) => ctx.fillText(line, textX, y + 14 + i * 15));
  ui.setFont(ctx, 11); ctx.fillText(copy.ui.close, x + w - 16, y + 5);
  hits.push({ id: 'lg-x', x: x + w - 23, y: y + 2, w: 21, h: 20 });
  let buttons: [string, string][];
  if (state.text === copy.ui.nothing || state.text === decisions.helper.map) buttons = [['lg-ok', copy.ui.ok]];
  else if (state.rung === 'personalise') buttons = [['lg-take', copy.form.yes], ['lg-later', copy.form.no]];
  else if (state.rung === 'form') buttons = [['lg-take', copy.form.yes], ['lg-later', copy.form.no]];
  else if (pointing) buttons = [...(state.act && (!state.act.startsWith('press:') || hits.some(h => h.id === state.act?.slice(6)) || remoteActions.includes(state.act)) ? [['lg-take', copy.ui.take] as [string, string]] : []), ['lg-ok', copy.ui.ok]];
  else buttons = [...(state.targets.length || state.beat !== 'cut' ? [['lg-show', copy.ui.show] as [string, string]] : []), ['lg-later', copy.ui.later]];
  let bx = x + 12;
  buttons.forEach(([id, label], i) => {
    ui.setFont(ctx, 10); const bw = Math.ceil(ctx.measureText(label).width) + 18, by = y + h - 29;
    if (skin === 'e3') aero.button(ctx, bx, by, bw, 21, label);
    else if (skin === 'e4') {
      ui.px(ctx, bx, by, bw, 21, i === 0 ? CHROME.button : CHROME.fieldEdge);
      if (i !== 0) ui.px(ctx, bx + 1, by + 1, bw - 2, 19, CHROME.field);
      ui.setFont(ctx, 10); ctx.fillStyle = i === 0 ? CHROME.buttonInk : CHROME.ink; ctx.fillText(label, bx + 9, by + 5);
    } else ui.button(ctx, bx, by, bw, 21, label);
    hits.push({ id, x: bx, y: by, w: bw, h: 21 }); bx += bw + 7;
  });
  return out;
}
