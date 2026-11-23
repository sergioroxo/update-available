/** 2016 documents and publication previews. Drawing only; the owner handles every press and ledger event. */
import { px, wrapText } from '../theme/chrome';
import { sansFor, textPx } from '../theme/fonts';
import { ERA3 as P, button } from '../theme/era3';
import { drawRenataFilm, PUBLISHED_FRAME } from '../theme/renataFilm';
import D from '../../../data/dialog/s3_vera.json';
export type SurfaceRect = { x: number; y: number; w: number; h: number };
export type SurfaceHit = SurfaceRect & { id: string };
export function studioFont(ctx: CanvasRenderingContext2D, size: number, bold = false): void {
  ctx.font = `${bold ? '600 ' : ''}${textPx(size, 'e3')}px ${sansFor('e3')}`; ctx.textBaseline = 'top';   // S374: 2016's floor in a headset
}
function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, width: number, size = 12, lead = size + 4, color: string = P.ink): number {
  studioFont(ctx, size); ctx.fillStyle = color;
  const lines = wrapText(ctx, value, width); lines.forEach((line, i) => ctx.fillText(line, x, y + i * lead));
  return lines.length * lead;
}
function control(ctx: CanvasRenderingContext2D, hit: (r: SurfaceHit) => void, id: string, label: string, x: number, y: number, w: number, primary = false): void {
  button(ctx, x, y, w, 28, label, { primary, size: 12 }); hit({ x, y, w, h: 28, id });
}
function paper(ctx: CanvasRenderingContext2D, a: SurfaceRect): void {
  px(ctx, a.x + 2, a.y + 2, a.w, a.h, P.glassEdge); px(ctx, a.x, a.y, a.w, a.h, P.white);
  px(ctx, a.x, a.y, a.w, 1, P.glassEdge);
}
// ⚑ S425 (UiB job 35 Part D, Act II) — `drawVeraArchive` (her record: As published / As sent, the filed tag, the mentor's note, the
//   footer, Next, Close record) is retired; Kindredraft's memory page is graceQueueLite `drawMemoryPage`. 76d0671d holds it.

/** The same story in four formats: the previews show distribution, not four unrelated menu bars. */
export function publicationPreview(ctx: CanvasRenderingContext2D, a: SurfaceRect, kind: number, excerpt: string, sent = false): void {
  paper(ctx, a); const x = a.x + 8, y = a.y + 6;
  studioFont(ctx, 11, true); ctx.fillStyle = P.titleText; ctx.fillText(D.send.destinations[kind], x, y);
  const top = y + 20, innerW = a.w - 16;
  if (kind === 0) {
    px(ctx, x, top, innerW, 12, P.accent); studioFont(ctx, 8); ctx.fillStyle = P.white; ctx.fillText(D.visual.groupHeader, x + 5, top + 2);
    studioFont(ctx, 9, true); ctx.fillStyle = P.ink; ctx.fillText(D.visual.storyBy, x, top + 17);
    studioFont(ctx, 10); ctx.fillStyle = P.greyDk; wrapText(ctx, excerpt, innerW).slice(0, 2).forEach((s, i) => ctx.fillText(s, x, top + 31 + i * 13));
  } else if (kind === 1) {
    studioFont(ctx, 9); ctx.fillStyle = P.greyDk; ctx.fillText(D.visual.emailHeader, x, top);
    px(ctx, x, top + 16, innerW, 1, P.glassEdge);
    studioFont(ctx, 11, true); ctx.fillStyle = P.ink; ctx.fillText(D.visual.storyBy, x, top + 22);
    studioFont(ctx, 10); ctx.fillStyle = P.greyDk; wrapText(ctx, excerpt, innerW).slice(0, 2).forEach((s, i) => ctx.fillText(s, x, top + 38 + i * 13));
  } else {
    const fw = kind === 2 ? 90 : 30, fh = kind === 2 ? 51 : 54;
    ctx.save(); ctx.beginPath(); ctx.rect(x, top, fw, fh); ctx.clip();
    const imageW = Math.round(fh * 16 / 9);
    drawRenataFilm(ctx, x + Math.round((fw - imageW) / 2), top, imageW, fh, PUBLISHED_FRAME);   // S382/S386: what is sent is the platform's version
    ctx.restore();
    studioFont(ctx, 11, true); ctx.fillStyle = P.ink; ctx.fillText(D.visual.storyBy, x + fw + 9, top + 5);
    text(ctx, kind === 2 ? D.visual.videoNote : D.visual.clipNote, x + fw + 9, top + 23, innerW - fw - 9, 10, 13, P.greyDk);
    px(ctx, x, top + fh + 4, innerW, 2, P.glassEdge);
  }
  if (sent) { studioFont(ctx, 9); ctx.fillStyle = P.greyDk; ctx.fillText(D.visual.copyActive, x, a.y + a.h - 14); }
}
export function drawVeraDistribution(ctx: CanvasRenderingContext2D, a: SurfaceRect, excerpt: string, sent: boolean, hit: (r: SurfaceHit) => void): void {
  px(ctx, a.x, a.y, a.w, a.h, P.glass);
  studioFont(ctx, 19, true); ctx.fillStyle = P.titleText; ctx.fillText(D.send.title, a.x + 10, a.y + 4);
  text(ctx, D.send.intro, a.x + 10, a.y + 30, a.w - 20, 12);
  const gap = 12, top = a.y + 54, cw = Math.floor((a.w - 32) / 2), ch = Math.floor((a.h - 54 - 65 - gap) / 2);
  for (let i = 0; i < 4; i++) publicationPreview(ctx, {x:a.x + 10 + i % 2 * (cw + gap), y:top + Math.floor(i / 2) * (ch + gap), w:cw, h:ch}, i, excerpt, sent);
  const foot = a.y + a.h - 58;
  text(ctx, sent ? D.send.sent : D.send.archive, a.x + 10, foot, a.w - 20, 10, 12, P.greyDk);
  text(ctx, sent ? D.send.loop : D.visual.archiveSeparate, a.x + 10, foot + 17, a.w - 200, 10, 12, P.greyDk);
  control(ctx, hit, sent ? 'vera-send-close' : 'vera-send', sent ? D.send.back : D.send.press, a.x + a.w - 180, a.y + a.h - 30, 170, true);
}
export function drawRetainedCopies(ctx: CanvasRenderingContext2D, a: SurfaceRect, approved: boolean, hit: (r: SurfaceHit) => void): void {
  px(ctx, a.x, a.y, a.w, a.h, P.glass);
  studioFont(ctx, 20, true); ctx.fillStyle = P.titleText; ctx.fillText(D.kit.takeDown, a.x + 14, a.y + 8);
  text(ctx, D.kit.receipt[0], a.x + 14, a.y + 39, a.w - 28, 13);
  const top = a.y + 77, gap = 10, cw = Math.floor((a.w - 48) / 3);
  for (let i = 0; i < 3; i++) {
    const xx = a.x + 14 + i * (cw + gap);
    paper(ctx, {x:xx,y:top,w:cw,h:133});
    studioFont(ctx, 13, true); ctx.fillStyle = P.titleText;
    ctx.fillText(`${[4,2,1][i]} · ${D.visual.retainedLabels[i]}`, xx + 10, top + 10);
    px(ctx, xx + 10, top + 34, cw - 20, 1, P.glassEdge);
    studioFont(ctx, 10, true); ctx.fillStyle = P.greyDk; ctx.fillText(D.visual.archiveTitle, xx + 10, top + 43);
    // ⚑ S403 (UiB job 30 B3; his 17 Nov: "the campaign kit repeating her 2014 story could go?") — the scheduled posts and
    //   the external copies no longer print the published sentence (her 2014 story met a third time). The original keeps
    //   her own words, "I came to the first night because of Nuala…": what they keep is what they edited out.
    if (i === 2) text(ctx, D.record.sentText.split('. ')[0] + '.', xx + 10, top + 60, cw - 20, 10, 13, P.greyDk);
    studioFont(ctx, 9, true); ctx.fillStyle = P.greyDk; ctx.fillText(D.visual.retainedStates[i], xx + 10, top + 115);
  }
  let yy = top + 149;
  for (const line of D.kit.receipt.slice(1)) yy += text(ctx, line, a.x + 14, yy, a.w - 28, 12, 16) + 3;
  text(ctx, approved ? D.kit.approved : D.kit.consent, a.x + 14, yy + 3, a.w - 28, 11, 14, P.greyDk);
  control(ctx, hit, 'vera-kit-close', D.kit.back, a.x + a.w - 170, a.y + a.h - 30, 156);
}
