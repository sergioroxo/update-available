/**
 * ⚑ S291 — THE SITE VIEWER'S LAYOUT. Turns a tab's blocks (model.ts) into a flat list of draw ops at a given width,
 * once, so scrolling is only a translate and a cull — the texture is re-uploaded when the VIEWER changes (scroll, tab,
 * hover), never per frame. Type is sized for a headset: body 22 px on a 1024 px-wide window that hangs 0.9 m wide.
 */
import type { Block } from './model';
import { DOORS, type Skin, type Year } from './skins';

export interface Rect { x: number; y: number; w: number; h: number }
export type Action =
  | { type: 'url'; url: string }
  | { type: 'page'; href: string }
  | { type: 'audio'; file: string }
  | { type: 'door'; year: Year };
export interface DocHit extends Rect { id: string; act: Action; tip: string }

export type Op =
  | { t: 'rect'; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; lw?: number; r?: number }
  | { t: 'text'; x: number; y: number; s: string; font: string; color: string; lh: number; u?: boolean }
  | { t: 'chip'; x: number; y: number; w: number; h: number; s: string; bg: string; ink: string; font: string }
  | { t: 'img'; x: number; y: number; w: number; h: number; src: string; alt: string }
  | { t: 'play'; x: number; y: number; w: number; h: number; file: string; label: string; font: string };

export interface Doc { h: number; ops: Op[]; hits: DocHit[] }

export const SIZE = { body: 22, lede: 24, small: 18, url: 16, h2: 34, h3: 27, h4: 23, mono: 18 } as const;
const LH = 1.46;

/** greedy word wrap; a word longer than the line (an address) is broken by characters */
export function wrap(ctx: CanvasRenderingContext2D, text: string, font: string, maxW: number): string[] {
  ctx.font = font;
  const out: string[] = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const t = line ? `${line} ${word}` : word;
      if (ctx.measureText(t).width <= maxW) { line = t; continue; }
      if (line) { out.push(line); line = ''; }
      if (ctx.measureText(word).width <= maxW) { line = word; continue; }
      // a word longer than the line (an address) is broken by characters
      let part = '';
      for (const ch of word) {
        if (ctx.measureText(part + ch).width > maxW && part) { out.push(part); part = ch; } else part += ch;
      }
      line = part;
    }
    out.push(line);
  }
  return out;
}

export interface ImageLookup { (src: string): { ok: boolean } }

export function layoutDoc(ctx: CanvasRenderingContext2D, blocks: Block[], width: number, skin: Skin, canPage: boolean): Doc {
  const ops: Op[] = [];
  const hits: DocHit[] = [];
  const pad = width > 700 ? 28 : 18;
  const cw = width - pad * 2;
  let y = pad;
  const F = (px: number, bold = false, face = skin.font): string => `${bold ? '700 ' : ''}${px}px ${face}`;
  let hid = 0;

  /** draw wrapped lines; returns the height used */
  const para = (s: string, x: number, w: number, px: number, color: string, bold = false, face = skin.font, underline = false): number => {
    const font = F(px, bold, face);
    const lines = wrap(ctx, s, font, w);
    const lh = Math.round(px * LH);
    lines.forEach((l, i) => ops.push({ t: 'text', x, y: y + i * lh, s: l, font, color, lh, u: underline }));
    return lines.length * lh;
  };
  const chip = (s: string, x: number, yy: number, status: keyof Skin['tag'], px = 15): number => {
    const font = F(px, true);
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(s.toUpperCase()).width) + 16, h = px + 10;
    ops.push({ t: 'chip', x, y: yy, w, h, s: s.toUpperCase(), bg: skin.tag[status][0], ink: skin.tag[status][1], font });
    return w;
  };
  const box = (x: number, yy: number, w: number, h: number, fill: string, edge: string, lw = 2): void => {
    ops.push({ t: 'rect', x, y: yy, w, h, fill, stroke: edge, lw, r: skin.os === 'w95' || skin.os === 'xp' ? 0 : 10 });
  };
  const addHit = (r: Rect, act: Action, tip: string): void => { hits.push({ ...r, id: `d${hid++}`, act, tip }); };
  const gap = (n: number): void => { y += n; };

  for (const b of blocks) {
    switch (b.k) {
      case 'h2': {
        gap(4);
        y += para(b.t, pad, cw, SIZE.h2, skin.h, true, skin.headFont);
        ops.push({ t: 'rect', x: pad, y: y + 2, w: cw, h: skin.os === 'w95' ? 0 : 2, fill: skin.rule });
        if (skin.os === 'w95') ops.push({ t: 'rect', x: pad, y: y + 3, w: cw, h: 0, stroke: skin.h, lw: 2 });
        gap(16);
        break;
      }
      case 'h3': {
        gap(14);
        const font = F(SIZE.h3, true, skin.headFont);
        const lines = wrap(ctx, b.t, font, b.tag ? cw - 150 : cw);
        const lh = Math.round(SIZE.h3 * LH);
        lines.forEach((l, i) => ops.push({ t: 'text', x: pad, y: y + i * lh, s: l, font, color: skin.h, lh }));
        if (b.tag && b.status) {
          ctx.font = font;
          chip(b.tag, pad + Math.ceil(ctx.measureText(lines[lines.length - 1]).width) + 14, y + (lines.length - 1) * lh + 5, b.status);
        }
        y += lines.length * lh + 6;
        break;
      }
      case 'h4': { gap(8); y += para(b.t, pad, cw, SIZE.h4, skin.h, true, skin.headFont) + 4; break; }
      case 'p': { y += para(b.t, pad, cw, SIZE.body, skin.ink) + 12; break; }
      case 'lede': { y += para(b.t, pad, cw, SIZE.lede, skin.ink) + 14; break; }
      case 'small': { y += para(b.t, pad, cw, SIZE.small, skin.dim) + 10; break; }
      case 'note': {
        const lines = wrap(ctx, b.t, F(SIZE.body), cw - 36).length;
        const h = lines * Math.round(SIZE.body * LH) + 20;
        box(pad, y, cw, h, skin.noteBg, skin.cardEdge, 1);
        ops.push({ t: 'rect', x: pad, y, w: 6, h, fill: skin.noteBar });
        y += 10; para(b.t, pad + 22, cw - 36, SIZE.body, skin.ink); y += h - 10 + 12;
        break;
      }
      case 'quote': {
        const lines = wrap(ctx, b.t, F(SIZE.body), cw - 40).length;
        const h = lines * Math.round(SIZE.body * LH) + 20 + 44;
        box(pad, y, cw, h, skin.card, skin.cardEdge, 2);
        ops.push({ t: 'rect', x: pad, y, w: 6, h, fill: skin.noteBar });
        y += 12; para(b.t, pad + 22, cw - 40, SIZE.body, skin.ink);
        const yy = y + lines * Math.round(SIZE.body * LH) + 8;
        const cwid = chip(b.tag, pad + 22, yy, b.status);
        ops.push({ t: 'text', x: pad + 22 + cwid + 12, y: yy - 2, s: b.long, font: F(SIZE.small), color: skin.dim, lh: 28 });
        y = y - 12 + h + 12;
        break;
      }
      case 'dl': {
        for (const [dt, dd] of b.rows) {
          y += para(dt, pad, cw, SIZE.body, skin.ink, true);
          y += para(dd, pad + 20, cw - 20, SIZE.body, skin.ink) + 10;
        }
        gap(4);
        break;
      }
      case 'ul': {
        for (const it of b.items) {
          ops.push({ t: 'text', x: pad + 4, y, s: '•', font: F(SIZE.body), color: skin.ink, lh: Math.round(SIZE.body * LH) });
          y += para(it.t, pad + 28, cw - 28, SIZE.body, skin.ink);
          if (it.sub) y += para(it.sub, pad + 28, cw - 28, SIZE.small, skin.dim);
          gap(8);
        }
        gap(4);
        break;
      }
      case 'mono': {
        const lh = Math.round(SIZE.mono * 1.5);
        const lines = b.lines.flatMap((l) => wrap(ctx, l, F(SIZE.mono, false, skin.mono), cw - 36));
        const h = lines.length * lh + 24;
        box(pad, y, cw, h, skin.card, skin.cardEdge, 2);
        lines.forEach((l, i) => ops.push({ t: 'text', x: pad + 18, y: y + 12 + i * lh, s: l, font: F(SIZE.mono, false, skin.mono), color: skin.ink, lh }));
        y += h + 14;
        break;
      }
      case 'src': {
        const lh = Math.round(SIZE.body * LH), ulh = Math.round(SIZE.url * 1.35), sl = Math.round(SIZE.small * LH);
        const tl = wrap(ctx, b.t, F(SIZE.body), cw - 36);
        const linkBlocks = b.links.map((l) => ({
          l, lab: wrap(ctx, l.label, F(SIZE.body), cw - 56), url: wrap(ctx, l.url, F(SIZE.url, false, skin.mono), cw - 56)
        }));
        const nl = b.links.length ? [] : wrap(ctx, b.nolink, F(SIZE.small), cw - 36);
        let h = 14 + 34 + tl.length * lh + 10;
        for (const lb of linkBlocks) h += lb.lab.length * lh + lb.url.length * ulh + 18;
        h += nl.length * sl + 12;
        box(pad, y, cw, h, skin.card, skin.cardEdge, 2);
        let yy = y + 14;
        const w0 = chip(b.tag, pad + 18, yy, b.status);
        if (b.conf) ops.push({ t: 'text', x: pad + 18 + w0 + 12, y: yy - 1, s: `confidence: ${b.conf}`, font: F(SIZE.small), color: skin.dim, lh: 26 });
        yy += 34;
        tl.forEach((l, i) => ops.push({ t: 'text', x: pad + 18, y: yy + i * lh, s: l, font: F(SIZE.body), color: skin.ink, lh }));
        yy += tl.length * lh + 10;
        for (const lb of linkBlocks) {
          const top = yy;
          ops.push({ t: 'text', x: pad + 18, y: top, s: '↗', font: F(SIZE.body, true), color: skin.link, lh });
          lb.lab.forEach((l, i) => ops.push({ t: 'text', x: pad + 42, y: yy + i * lh, s: l, font: F(SIZE.body), color: skin.link, lh, u: true }));
          yy += lb.lab.length * lh;
          lb.url.forEach((l, i) => ops.push({ t: 'text', x: pad + 42, y: yy + i * ulh, s: l, font: F(SIZE.url, false, skin.mono), color: skin.dim, lh: ulh }));
          yy += lb.url.length * ulh + 18;
          addHit({ x: pad + 6, y: top - 6, w: cw - 12, h: yy - top }, { type: 'url', url: lb.l.url }, lb.l.url);
        }
        nl.forEach((l, i) => ops.push({ t: 'text', x: pad + 18, y: yy + i * sl, s: l, font: F(SIZE.small), color: skin.dim, lh: sl }));
        y += h + 14;
        break;
      }
      case 'links': {
        const lh = Math.round(SIZE.body * LH), ulh = Math.round(SIZE.url * 1.35), sl = Math.round(SIZE.small * LH);
        for (const it of b.items) {
          const lab = wrap(ctx, it.label, F(SIZE.body), cw - 56);
          const url = wrap(ctx, it.url, F(SIZE.url, false, skin.mono), cw - 56);
          const note = it.note ? wrap(ctx, it.note, F(SIZE.small), cw - 56) : [];
          const h = 12 + lab.length * lh + url.length * ulh + note.length * sl + 14;
          box(pad, y, cw, h, skin.card, skin.cardEdge, 2);
          let yy = y + 12;
          ops.push({ t: 'text', x: pad + 16, y: yy, s: '↗', font: F(SIZE.body, true), color: skin.link, lh });
          lab.forEach((l, i) => ops.push({ t: 'text', x: pad + 40, y: yy + i * lh, s: l, font: F(SIZE.body), color: skin.link, lh, u: true }));
          yy += lab.length * lh;
          url.forEach((l, i) => ops.push({ t: 'text', x: pad + 40, y: yy + i * ulh, s: l, font: F(SIZE.url, false, skin.mono), color: skin.dim, lh: ulh }));
          yy += url.length * ulh;
          note.forEach((l, i) => ops.push({ t: 'text', x: pad + 40, y: yy + i * sl, s: l, font: F(SIZE.small), color: skin.dim, lh: sl }));
          addHit({ x: pad, y, w: cw, h }, { type: 'url', url: it.url }, it.url);
          y += h + 10;
        }
        gap(4);
        break;
      }
      case 'key': {
        const rows = b.rows.map((r) => wrap(ctx, r.long, F(SIZE.small), cw - 190));
        const lh = Math.round(SIZE.small * LH);
        const h = 18 + 34 + rows.reduce((a, r) => a + Math.max(r.length * lh, 30) + 8, 0) + 8;
        box(pad, y, cw, h, skin.card, skin.cardEdge, 2);
        ops.push({ t: 'text', x: pad + 18, y: y + 14, s: b.t, font: F(SIZE.body, true), color: skin.h, lh: 30 });
        let yy = y + 14 + 38;
        b.rows.forEach((r, i) => {
          chip(r.tag, pad + 18, yy + 2, r.status);
          rows[i].forEach((l, j) => ops.push({ t: 'text', x: pad + 170, y: yy + j * lh, s: l, font: F(SIZE.small), color: skin.ink, lh }));
          yy += Math.max(rows[i].length * lh, 30) + 8;
        });
        y += h + 14;
        break;
      }
      case 'fig': {
        const dw = Math.min(cw - 24, Math.round(b.w * 1.4), 560);
        const dh = Math.round(dw * b.h / b.w);
        const cap = wrap(ctx, b.caption, F(SIZE.small), cw - 36), cred = wrap(ctx, b.credit, F(SIZE.small), cw - 36);
        const lh = Math.round(SIZE.small * LH);
        const h = 14 + dh + 12 + cap.length * lh + 6 + cred.length * lh + 12;
        box(pad, y, cw, h, skin.card, skin.cardEdge, 2);
        ops.push({ t: 'img', x: pad + 18, y: y + 14, w: dw, h: dh, src: b.img, alt: b.alt });
        let yy = y + 14 + dh + 12;
        cap.forEach((l, i) => ops.push({ t: 'text', x: pad + 18, y: yy + i * lh, s: l, font: F(SIZE.small), color: skin.ink, lh }));
        yy += cap.length * lh + 6;
        cred.forEach((l, i) => ops.push({ t: 'text', x: pad + 18, y: yy + i * lh, s: l, font: F(SIZE.small), color: skin.dim, lh }));
        y += h + 14;
        break;
      }
      case 'media': {
        const lh = Math.round(SIZE.body * LH), sl = Math.round(SIZE.small * LH);
        const title = wrap(ctx, b.title, F(SIZE.h4, true, skin.headFont), cw - 36);
        const what = wrap(ctx, b.what, F(SIZE.body), cw - 36);
        const cred = wrap(ctx, b.credit, F(SIZE.small), cw - 36);
        const lyr = b.lyrics.flatMap((l) => wrap(ctx, l, F(SIZE.small), cw - 56));
        const lyrH = lyr.length ? 34 + lyr.length * sl + 6 : 0;
        const playable = !!b.file && b.type === 'audio';
        const filmNote = !!b.file && b.type !== 'audio';
        const extra = playable ? 62 : filmNote ? sl + 8 : 0;
        const h = 14 + title.length * Math.round(SIZE.h4 * LH) + what.length * lh + 8 + extra + lyrH + cred.length * sl + 16;
        box(pad, y, cw, h, skin.card, skin.cardEdge, 2);
        let yy = y + 14;
        title.forEach((l, i) => ops.push({ t: 'text', x: pad + 18, y: yy + i * Math.round(SIZE.h4 * LH), s: l, font: F(SIZE.h4, true, skin.headFont), color: skin.h, lh: Math.round(SIZE.h4 * LH) }));
        yy += title.length * Math.round(SIZE.h4 * LH);
        what.forEach((l, i) => ops.push({ t: 'text', x: pad + 18, y: yy + i * lh, s: l, font: F(SIZE.body), color: skin.ink, lh }));
        yy += what.length * lh + 8;
        if (playable) {
          ops.push({ t: 'play', x: pad + 18, y: yy, w: 210, h: 48, file: b.file, label: 'Play', font: F(SIZE.body, true) });
          addHit({ x: pad + 18, y: yy, w: 210, h: 48 }, { type: 'audio', file: b.file }, b.title);
          yy += 62;
        } else if (filmNote) {
          ops.push({ t: 'text', x: pad + 18, y: yy, s: canPage ? 'Plays on the web page version (open it from the bar above).' : 'Plays on the web page version, outside the headset.', font: F(SIZE.small), color: skin.dim, lh: sl });
          yy += sl + 8;
        }
        if (lyr.length) {
          ops.push({ t: 'text', x: pad + 18, y: yy, s: b.lyricsTitle, font: F(SIZE.body, true), color: skin.h, lh });
          yy += 34;
          lyr.forEach((l, i) => ops.push({ t: 'text', x: pad + 38, y: yy + i * sl, s: l, font: F(SIZE.small), color: skin.ink, lh: sl }));
          yy += lyr.length * sl + 6;
        }
        cred.forEach((l, i) => ops.push({ t: 'text', x: pad + 18, y: yy + i * sl, s: l, font: F(SIZE.small), color: skin.dim, lh: sl }));
        y += h + 14;
        break;
      }
      case 'terms': {
        const lh = Math.round(SIZE.body * LH);
        for (const r of b.rows) {
          gap(6);
          ops.push({ t: 'text', x: pad, y, s: r.term, font: F(SIZE.body, true), color: skin.ink, lh });
          ctx.font = F(SIZE.body, true);
          const tw = ctx.measureText(r.term).width;
          const sf = F(15, false);
          ctx.font = sf;
          const sw = Math.ceil(ctx.measureText(r.status).width) + 14;
          if (tw + 14 + sw < cw) ops.push({ t: 'chip', x: pad + tw + 12, y: y + 3, w: sw, h: 26, s: r.status, bg: skin.card, ink: skin.dim, font: sf });
          y += lh;
          y += para(r.def, pad + 20, cw - 20, SIZE.body, skin.ink) + 6;
        }
        gap(4);
        break;
      }
      case 'beats': {
        const lh = Math.round(SIZE.body * LH), sl = Math.round(SIZE.small * LH);
        b.items.forEach((it, i) => {
          const head = `${i + 1}.  ${it.label}${it.opt ? `  (${it.opt})` : ''}`;
          y += para(head, pad, cw, SIZE.body, skin.ink, true);
          y += para(it.hint, pad + 28, cw - 28, SIZE.body, skin.ink);
          y += para(it.where, pad + 28, cw - 28, SIZE.small, skin.dim) + 12;
          void lh; void sl;
        });
        break;
      }
      case 'pagelink': {
        const lh = Math.round(SIZE.body * LH), sl = Math.round(SIZE.small * LH);
        const lab = wrap(ctx, b.label, F(SIZE.body, true), cw - 56), note = wrap(ctx, b.note, F(SIZE.small), cw - 56);
        const h = 12 + lab.length * lh + note.length * sl + 14;
        box(pad, y, cw, h, skin.card, skin.cardEdge, 2);
        lab.forEach((l, i) => ops.push({ t: 'text', x: pad + 40, y: y + 12 + i * lh, s: l, font: F(SIZE.body, true), color: skin.link, lh, u: true }));
        ops.push({ t: 'text', x: pad + 16, y: y + 12, s: '↗', font: F(SIZE.body, true), color: skin.link, lh });
        note.forEach((l, i) => ops.push({ t: 'text', x: pad + 40, y: y + 12 + lab.length * lh + i * sl, s: l, font: F(SIZE.small), color: skin.dim, lh: sl }));
        addHit({ x: pad, y, w: cw, h }, { type: 'page', href: b.href }, b.href);
        y += h + 14;
        break;
      }
      case 'doors': {
        const cols = cw >= 640 ? 2 : 1, gapx = 16, dw = Math.floor((cw - gapx * (cols - 1)) / cols);
        const most = Math.max(...b.items.map((d) => wrap(ctx, d.text, F(SIZE.small), dw - 40).length));
        const dh = 100 + most * 26 + 14;
        b.items.forEach((d, i) => {
          const cx = pad + (i % cols) * (dw + gapx), cy = y + Math.floor(i / cols) * (dh + 16);
          const [bg, ink] = DOORS[d.year];
          ops.push({ t: 'rect', x: cx, y: cy, w: dw, h: dh, fill: bg, stroke: skin.ink, lw: 3, r: 10 });
          ops.push({ t: 'text', x: cx + 20, y: cy + 12, s: d.year, font: F(46, true), color: ink, lh: 54 });
          ops.push({ t: 'text', x: cx + 20, y: cy + 68, s: d.who, font: F(SIZE.body, true), color: ink, lh: 30 });
          const ls = wrap(ctx, d.text, F(SIZE.small), dw - 40);
          ls.forEach((l, j) => ops.push({ t: 'text', x: cx + 20, y: cy + 98 + j * 26, s: l, font: F(SIZE.small), color: ink, lh: 26 }));
          addHit({ x: cx, y: cy, w: dw, h: dh }, { type: 'door', year: d.year }, `Open ${d.year}`);
        });
        y += Math.ceil(b.items.length / cols) * (dh + 16);
        break;
      }
    }
  }
  return { h: y + pad, ops, hits };
}
