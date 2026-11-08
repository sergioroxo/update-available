/**
 * ⚑ S332 — THE SOCIETAL FRAME on GracePlatform: a Trending box of real, dated 2016 news (data/strings/e3_news.json;
 * every item opened and recorded in docs/reinterp/SOURCES_2016_FRAME_2026-11-08.md). The platform shows it as it
 * shows anything: calmly, beside the work. Nothing comments on it. Static: drawn with the page, no clock.
 */
import news from '../../../data/strings/e3_news.json';
import { px, setFont, wrapText } from '../theme/chrome';
import { ERA3 } from '../theme/era3';

/** draws the box at (x, y), at most `maxH` tall; returns the height used */
export function drawTrending(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, maxH: number, ink: string = ERA3.accent): number {
  let yy = y + 6;
  const rows: { date: string; lines: string[] }[] = [];
  setFont(ctx, 9);
  for (const it of news.items) rows.push({ date: it.date, lines: wrapText(ctx, it.text, w - 14).slice(0, 3) });
  let h = 20 + rows.reduce((n, r) => n + 12 + r.lines.length * 11 + 4, 0) + 12;
  while (h > maxH && rows.length > 1) { const r = rows.pop()!; h -= 12 + r.lines.length * 11 + 4; }
  px(ctx, x, y, w, h, ERA3.white);
  px(ctx, x, y, w, 1, ERA3.glassEdge);
  setFont(ctx, 10); ctx.fillStyle = ERA3.ink; ctx.fillText(news.label, x + 7, yy);
  yy += 16;
  for (const r of rows) {
    setFont(ctx, 8); ctx.fillStyle = ERA3.grey; ctx.fillText(r.date, x + 7, yy); yy += 11;
    setFont(ctx, 9); ctx.fillStyle = ink;
    r.lines.forEach((ln, i) => ctx.fillText(ln, x + 7, yy + i * 11));
    yy += r.lines.length * 11 + 5;
  }
  setFont(ctx, 8); ctx.fillStyle = ERA3.grey; ctx.fillText(news.source, x + 7, y + h - 11);
  return h;
}
