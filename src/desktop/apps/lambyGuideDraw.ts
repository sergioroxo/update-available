/** Shared balloon grammar with setup; palette and chrome follow the surface. */
import * as ui from '../theme/chrome';
import * as aero from '../theme/era3';
import { ERA1 } from '../theme/era1';
import { ERA3 } from '../theme/era3';
import { CHROME, OS26 } from '../theme/era4';
import { edgeRR, fillRR, softShadow } from './desk26';
import { drawLambyChar } from './lambyChar';
import { reducedMotion } from '../../state/motion';
import type { GuideEra, GuideView } from '../../narrative/lambyGuide';
import copy from '../../../data/strings/lambyGuide.json';
import decisions from '../../../data/strings/cx3b.json';
export interface GuideHit { id: string; x: number; y: number; w: number; h: number; label?: string; tip?: string }
/** `box` (S407 / 97-13): the balloon's own rectangle while it is up — what lies under it cannot be aimed at or pressed */
export interface GuidePaint { rings: GuideHit[]; balloon: boolean; box?: { x: number; y: number; w: number; h: number }; placed?: { x: number; y: number; w: number; h: number; score: number } }
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
/** S271 (his 31 Oct: "plenty of multiple lambies that need to be fixed") — in a headset Lamby steps OUT of the
 *  screen into the room (VR-05); while he is out there, the balloon on the glass is drawn without him */
export const guideBody = { inRoom: false };
/** ⚑ S429 (UiB job 38 F2) — a line of text on the page under a balloon (logical px): the balloon's edges keep out of it */
export interface PageLine { x0: number; x1: number; y0: number; y1: number }
export function drawLambyGuide(ctx: CanvasRenderingContext2D, skin: GuideEra, state: GuideView, hits: GuideHit[], size = { w: 512, h: 384 }, remoteActions: string[] = [], pageLines: PageLine[] = [], protect: string[] = [], keepOut: GuideHit[] = [],
  page: { rects: PageLine[]; content: { x: number; y: number; w: number; h: number } | null } = { rects: [], content: null }): GuidePaint {
  const out: GuidePaint = { rings: [], balloon: false };
  if (state.era !== skin) return out;
  const W = size.w, H = size.h, tx = W - (skin === 'e3' ? 182 : 108), ty = H - 20;
  const accent = skin === 'e3' ? ERA3.accent : skin === 'e4' ? CHROME.accent : ERA1.navy;
  const ink = skin === 'e4' ? CHROME.ink : skin === 'e3' ? ERA3.ink : ERA1.black;
  const ground = skin === 'e4' ? CHROME.field : skin === 'e3' ? ERA3.glass : skin === 'e2' ? ERA1.paper : ERA1.tooltip;
  // A head in the tray; cue lifts it by one pixel. Uses the same character, cropped to its head.
  // ⚑ S327 / T25 (his 8 Nov headset session: "where is our guide?") — 2016's tray is wider, its name larger, so the
  //   guide can be found on the taskbar from the seat in a headset
  if (skin === 'e3') { ui.px(ctx, tx - 2, ty - 5, 84, 24, ERA3.tray); ui.px(ctx, tx - 2, ty - 5, 84, 1, ERA3.accentHi); }
  const headY = ty + 8 - (state.rung === 'cue' ? state.frame % 2 : 0);
  ctx.save(); ctx.beginPath(); ctx.rect(tx, ty - 3, 20, 21); ctx.clip();
  if (skin === 'e4') { ui.setFont(ctx, 16); ctx.fillStyle = accent; ctx.fillText(decisions.helper.e4, tx + 5, ty); }
  else if (skin === 'e3') aero.drawLambMark(ctx, tx + 10, headY - 1, 0.7);
  else drawLambyChar(ctx, tx + 10, headY + 4, { mood: 'cheerful', action: 'idle', scale: 0.24, headOnly: true, t: state.rung === 'cue' ? state.time : 0, moodStart: 0 }); ctx.restore();
  ui.setFont(ctx, skin === 'e3' ? 12 : 9); ctx.fillStyle = skin === 'e3' || skin === 'e2' ? ERA3.white : ink; if (skin !== 'e4') ctx.fillText(decisions.helper[skin], tx + 22, skin === 'e3' ? ty + 1 : ty + 5);   // S272: 2003's bar is blue
  hits.push({ id: 'lg-tray', label: decisions.helper[skin], tip: state.hidden ? undefined : copy.ui.trayTip, x: tx, y: skin === 'e3' ? ty - 5 : ty - 3, w: skin === 'e3' ? 82 : 60, h: skin === 'e3' ? 24 : 21 });
  if (state.hidden || !state.text) return out;
  // ⚑ S394 (UiB job 27 B3) — the Lamby set's call and its later offer are drawn IN VIEW by the set's own card
  //   (src/room/teachingTv.ts TvCall), wherever the visitor is looking; the glass does not say them a second time
  if (state.rung === 'tv' || state.rung === 'tvcall') return out;
  out.balloon = true;
  const targets = state.targets.flatMap(id => hits.filter(h => h.id === id));
  const multiple = state.beat === 'pledge' || state.beat === 'consent' || state.beat === 'steps';
  const selected = multiple ? targets : targets.slice(0, 1);
  const pointing = state.rung === 'show' || state.rung === 'start' || state.rung === 'file';   // S401: the file
  let w = Math.min(state.rung === 'choice' ? 304 : 272, W - 8), x = W - w - 4;   // ⚑ S362 / H33: three buttons need a wider balloon
  ui.setFont(ctx, 11);
  // ⚑ S429 (UiB job 38 F2; the headset run's frame: "an empty band between its text and Got it") — 2016's balloon is as tall as its
  //   words and its buttons (14 above the first line, 15 a line, 6 under the last, the buttons' 29); the other eras keep their 112
  //   floor (their lamb stands beside it)
  const heightFor = (ww: number): number => {
    const n = ui.wrapText(ctx, state.text ?? "", ww - (skin === "e4" ? 66 : 36)).length;
    return skin === 'e3' ? 49 + n * 15 : Math.max(112, 58 + n * 15);
  };
  let h = heightFor(w);
  let y = W < 300 ? 2 : H - 22 - h - 70;
  if (pointing && selected.some(r => r.x < x + w && r.x + r.w > x && r.y < y + h && r.y + r.h > y)) y = 26;
  // ⚑ S429 (F2; "its edges slice the page's lines": "Youth drop-in · Quay Street" across its top, the Trending item across its foot,
  //   and words under its left side) — 2016's balloon never cuts a line of the page under it in half: no line crosses its top or its
  //   foot, and none crosses its left or right side. It may cover whole lines. It keeps to the right of the platform, over the
  //   taskbar's Lambient; it moves up or down and, where the page's columns need it, narrows (to 260…200 px). Of the places it may take, in this order: it never lies over the press the step waits for (`protect`: the
  //   path's own controls, its own pointer's), then it cuts no line, then it leaves the page's other controls whole (a button cut in half
  //   by its edge last of all, one it covers next), then the nearest, the widest, a little clear of the lines before touching them.
  //   ⚑ S429b (G2; the coordinator: "an asked balloon must not hide the press its own line names" — Lesson 1's "Send to the network",
  //   Lesson 3's replies, a finished lesson's Back to Today) — ONE RULE, asked or not: it never lies over the step's own press
  //   (`protect`, its pointer's targets) or over any BUTTON of the page (a press that small is always one a line might name: the
  //   lessons' sends, replies, adds and leaves, Back to Today, the cards' answers). It may cover whole lines of text, a picture, a
  //   tile or a list row. It looks over the whole height of the page for that place, nearest first. (S429 kept clear of the step's
  //   press for unasked lines only: 3fa9452d.)
  // ⚑ S429c (H1; the coordinator's look at S429b: "Lambient's balloon covers only whole items") — and the page's ITEMS too: its cards,
  //   rows, panels, buttons and pictures (the rectangles it fills, `page.rects`, of 12 px or more, the window's own grounds left out; a
  //   rectangle with a dozen or more fills inside it is a picture, the film, and what is drawn inside it belongs to it). Each item is
  //   wholly under the balloon (and its tail) or wholly clear of it: none crosses an edge, no sliver of one shows above or below. Its
  //   side lines up with the page's content edge (right or left) or with a column's own left edge, and what it covers lies in one
  //   column. It covers part of a picture only where no other place keeps every item whole, and then the fewest. (S429b's balloon ran
  //   10 px past the content edge, against the platform's: 2325c60b.)
  if (skin === 'e3' && pageLines.length) {
    const guard = new Set([...protect, ...state.targets]);
    const controls = [...hits.filter((r) => !r.id.startsWith('lg-') && !r.id.startsWith('mirror') && r.w * r.h < W * H * 0.2), ...keepOut.map((r) => ({ ...r, id: 'keep:' + r.id }))];
    const isButton = (r: GuideHit): boolean => guard.has(r.id) || r.id.startsWith('keep:') || (r.w * r.h <= 6000 && r.h <= 40 && !r.id.startsWith('task-') && !r.id.startsWith('family-sel'));
    const C = page.content ?? { x: 4, y: 26, w: W - 8, h: H - 60 }, cL = C.x, cR = C.x + C.w;
    type Box = { x0: number; x1: number; y0: number; y1: number };
    const inside = (a: Box, b: Box): boolean => a.x0 >= b.x0 - 0.5 && a.x1 <= b.x1 + 0.5 && a.y0 >= b.y0 - 0.5 && a.y1 <= b.y1 + 0.5;
    const meets = (a: Box, b: Box): boolean => a.x0 < b.x1 - 0.5 && a.x1 > b.x0 + 0.5 && a.y0 < b.y1 - 0.5 && a.y1 > b.y0 + 0.5;
    const sized = page.rects.filter((r) => r.x1 - r.x0 >= 12 && r.y1 - r.y0 >= 12 && r.y0 >= C.y - 1 && r.x1 - r.x0 < C.w * 0.9 && (r.x1 - r.x0) * (r.y1 - r.y0) < C.w * C.h * 0.3);
    const pics = sized.filter((p) => { let n = 0; for (const r of page.rects) if (r !== p && inside(r, p) && ++n >= 12) return true; return false; });
    const items = sized.filter((r) => !pics.includes(r) && !pics.some((p) => inside(r, p)));
    const lines = pageLines;   // every line, a picture's own (the film's subtitles) too
    const pinnedTop = pointing && y === 26;
    let best: { score: number; w: number; x: number; y: number; h: number } | null = null;
    // narrower than 200 only where the page's own column is (Lesson 2's right column is 180 wide, Lesson 3's lower left 184): a
    //   last resort before cutting an item, and before covering part of a picture
    for (const [k, ww] of [w, 260, 248, 236, 224, 212, 200, 196, 190, 184, 180].filter((v, i, a) => v <= w && a.indexOf(v) === i).entries()) {
      const hh = heightFor(ww), lo = 26, hi = H - 22 - hh - 8, base = pinnedTop ? 26 : H - 22 - hh - 70;
      // where its side may stand: the content's right edge, its left edge, or a column's own left edge (an item's or a line's start)
      const xs = new Map<number, number>([[cR - ww, 0], [cL, 60]]);
      for (const r of [...items, ...lines]) { const xx = Math.round(r.x0); if (xx > cL + 20 && xx + ww <= cR && !xs.has(xx) && xs.size < 12) xs.set(xx, 120); }
      for (const [xx, pref] of xs) {
        const tl = Math.max(xx + 8, Math.min(xx + ww - 8, tx + 7));
        const nearX = (r: Box): boolean => r.x1 > xx - 1 && r.x0 < xx + ww + 1;
        const L = lines.filter(nearX), I = items.filter(nearX), P = pics.filter(nearX), K = controls.filter((r) => r.x < xx + ww && r.x + r.w > xx);
        for (let yy = lo; yy <= hi; yy++) {
          const body = { x0: xx, x1: xx + ww, y0: yy, y1: yy + hh }, tail = { x0: tl, x1: tl + 6, y0: yy + hh, y1: yy + hh + 6 };
          const cuts = (r: Box): boolean => (meets(r, body) && !inside(r, body)) || meets(r, tail);
          let lineCut = 0, itemCut = 0, picCut = 0, guarded = 0, ctrl = 0;
          for (const l of L) if (cuts(l)) lineCut++;
          if (lineCut > 2) continue;
          for (const r of I) if (cuts(r)) itemCut++;
          for (const p of P) if (meets(p, body) || meets(p, tail)) picCut++;
          for (const r of K) {
            if (r.y >= yy + hh + 6 || r.y + r.h <= yy) continue;
            if (isButton(r)) guarded++; else if (!(r.x >= xx && r.x + r.w <= xx + ww && r.y >= yy && r.y + r.h <= yy + hh)) ctrl++;
          }
          // one column: what it covers wholly stands in one column (no two covered things side by side with a gap between them)
          const covered = [...L, ...I].filter((r) => inside(r, body));
          let twoCols = 0;
          for (const a2 of covered) { for (const b2 of covered) if (a2.x1 + 6 < b2.x0 && a2.y1 > b2.y0 && a2.y0 < b2.y1) { twoCols = 1; break; } if (twoCols) break; }
          const score = guarded * 1e9 + lineCut * 1e7 + itemCut * 1e6 + twoCols * 5e5 + picCut * 1e5 + (ww < 200 ? 2e4 : 0) + ctrl * 1e4 + Math.abs(yy - base) * 10 + pref + k;
          if (!best || score < best.score) best = { score, w: ww, x: xx, y: yy, h: hh };
        }
      }
    }
    if (best) ({ w, x, y, h } = best);
    out.placed = best ? { x, y, w, h, score: best.score } : undefined;
  }
  out.box = { x, y, w, h };
  const cx = skin === 'e3' ? tx + 10 : W - 48, cy = H - 59;
  const left = selected.length > 0 && selected[0].x + selected[0].w / 2 < cx;
  if ((skin === 'e1' || skin === 'e2') && !guideBody.inRoom) drawLambyChar(ctx, cx, cy, { mood: 'cheerful', action: pointing ? 'point' : 'idle', scale: 0.48, t: state.frame / 3, moodStart: 0, pointLeft: left });
  if (pointing) for (const r of selected) out.rings.push(drawGuidePointer(ctx, r, skin === 'e3' ? { x: cx, y: ty - 4 } : { x: left ? cx - 44 : cx - 26, y: cy }, accent, state.frame));
  if (skin === 'e1' || skin === 'e2') drawLambyTooltip(ctx, x, y, w, h, ground);
  else if (skin === 'e4') {
    // ⚑ S417 (UiB job 34 Part A) — 2026's skin wears the 2026 desktop's (desk26.ts): a rounded card, a soft shadow, its tail
    softShadow(ctx, { x, y, w, h }, 12, 1.1);
    edgeRR(ctx, x, y, w, h, 12, OS26.menuEdge, OS26.menuPanel);
    const tailX = Math.max(x + 14, Math.min(x + w - 18, cx - 3));
    ctx.beginPath(); ctx.moveTo(tailX, y + h - 1); ctx.lineTo(tailX + 6, y + h + 6); ctx.lineTo(tailX + 12, y + h - 1); ctx.closePath();
    ctx.fillStyle = OS26.menuPanel; ctx.fill();
  } else {
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
  ui.setFont(ctx, 11); ctx.fillStyle = skin === 'e4' ? OS26.winInk : ink;
  ui.wrapText(ctx, state.text, textW).forEach((line, i) => ctx.fillText(line, textX, y + 14 + i * 15));
  ui.setFont(ctx, 11); ctx.fillText(copy.ui.close, x + w - 16, y + 5);
  hits.push({ id: 'lg-x', x: x + w - 23, y: y + 2, w: 21, h: 20 });
  let buttons: [string, string][];
  if (state.text === copy.ui.nothing || state.text === decisions.helper.map || state.rung === 'asked') buttons = [['lg-ok', copy.ui.ok]];   // ⚑ S428: an asked line
  else if (state.rung === 'personalise') buttons = [['lg-take', copy.form.yes], ['lg-later', copy.form.no]];
  else if (state.rung === 'form') buttons = [['lg-take', copy.form.yes], ['lg-later', copy.form.no]];
  else if (state.rung === 'root') buttons = [['lg-take', copy.root.yes], ['lg-later', copy.form.no]];
  else if (state.rung === 'choice') buttons = [['lg-take', copy.choice.releaseYes], ['lg-alt', copy.choice.formYes], ['lg-later', copy.form.no]];   // ⚑ S362 / H33: two answers + No thanks
  else if (state.rung === 'harbor') buttons = [['lg-take', copy.harbor.yes], ['lg-later', copy.form.no]];   // S345
  else if (state.rung === 'message') buttons = [['lg-take', copy.message.yes], ['lg-later', copy.form.no]];   // S408 / 03-13
  else if (state.rung === 'remind') buttons = [...(state.act ? [['lg-take', copy.remind.yes] as [string, string]] : []), ['lg-ok', copy.ui.ok]];   // S408 / 03-19
  else if (pointing) buttons = [...(state.act && (!state.act.startsWith('press:') || hits.some(h => h.id === state.act?.slice(6)) || remoteActions.includes(state.act)) ? [['lg-take', copy.ui.take] as [string, string]] : []), ['lg-ok', copy.ui.ok]];
  else buttons = [...(state.targets.length || state.beat !== 'cut' ? [['lg-show', copy.ui.show] as [string, string]] : []), ['lg-later', copy.ui.later]];
  let bx = x + 12;
  buttons.forEach(([id, label], i) => {
    ui.setFont(ctx, 10); const bw = Math.ceil(ctx.measureText(label).width) + 18, by = y + h - 29;
    if (skin === 'e3') aero.button(ctx, bx, by, bw, 21, label);
    else if (skin === 'e4') {
      // ⚑ S417 — pills, as the 2026 desktop's (the first is the one it offers)
      if (i === 0) fillRR(ctx, bx, by, bw, 21, 10.5, OS26.menuButton); else edgeRR(ctx, bx, by, bw, 21, 10.5, OS26.winEdge, OS26.win);
      ui.setFont(ctx, 10); ctx.fillStyle = i === 0 ? OS26.menuButtonInk : OS26.winInk; ctx.fillText(label, bx + 9, by + 5);
    } else ui.button(ctx, bx, by, bw, 21, label);
    hits.push({ id, x: bx, y: by, w: bw, h: 21 }); bx += bw + 7;
  });
  // ⚑ S406 / H2 (his headset run, 20 Nov: the board's cards "can be pressed" behind Lambient's balloon) — the balloon's body is a
  //   COVER, laid after its buttons: a press on it is the balloon's (it takes it and does nothing), never the card under it.
  //   Every surface tests its `lg-` rects first, so this one rule holds the balloon whole in every era (frame/xrTargets.ts).
  hits.push({ id: 'lg-cover', x, y, w, h: h + 6 });
  return out;
}
