/**
 * ⚑ S205 — YOUR STORY (2003): the network turns you into media.
 *
 * His ask (2026-09-30): 2003 was the thinnest era; "Daniel is requested to come and film his testimony to comply
 * with its evangelisation needs… maybe that's one of the ways he met Caleb". His research ('Yes — the testimony
 * layer is historically…', 2026-10-01) gave the shape, and his answers fixed it: all five steps, in order; Daniel and
 * Caleb meet AGAIN at the shoot (they knew each other at New Morning in 1997 — his song is from its last night); the
 * footage silent, with subtitles; no webcam yet.
 *
 * The life cycle, one window, five stages, each filed (`testimony-*`, 2003's record):
 *   1 PREP     — STORY PREPARATION: six suggested topics, each with a line pulled from his 1997 file. He answers
 *                nothing; the institution does the manufacturing from what it already holds.
 *   2 RELEASE  — MEDIA PARTICIPATION & RELEASE, filled in from his profile; "website" is already ticked inside
 *                "ministry communications"; DISTRIBUTION: APPROVED. One live button. (A composite — no ex-gay release
 *                of the period was found; the dossier says so.)
 *   3 TAPES    — TAPE_04_CAPTURE: Daniel_A, Caleb_B, the B-roll, the room tone. Daniel's take is the template in his
 *                mouth; the producer says cut; THE TAPE KEEPS RUNNING; Caleb walks in looking for where to sit. The
 *                footage is the people's: bare, nothing scored, nothing narrated.
 *   4 CUT      — the Story Editor assembles it: chapter cards between his sentences (CONFUSION → SURRENDER → CHANGE →
 *                HOPE), the rest into Unused media ("I still…", "some days…", "…Caleb?"). He can only press Next cut
 *                and Export. (2016's "Cut the Story" is this, industrialised.)
 *   5 ONLINE   — "Your testimony is reaching people": his page on the ministry's site, a .wmv that buffers on dial-up,
 *                "Are you struggling too? Start here →", and the week's count of applications started from it.
 * Then — and only then — Caleb's first message lands: "saw they put yours up." (os.ts, s2_caleb.json).
 *
 * Drawn in 2003's desktop chrome (ERA1's, as Restorify's windows are); the footage in theme/calendar.ts's FOOTAGE.
 */
import { ERA1 } from '../theme/era1';
import * as ui from '../theme/chrome';
import { FOOTAGE as F } from '../theme/calendar';
import { entriesByEra } from '../../witness/record';
import { ledger } from '../../state/ledger';
import T from '../../../data/dialog/s2_testimony.json';

interface Hit { x: number; y: number; w: number; h: number; id: string }
type Stage = 'prep' | 'release' | 'tapes' | 'player' | 'cut' | 'online';
type ClipId = 'daniel' | 'caleb' | 'broll' | 'tone';
interface Line { t: number; who: string; text: string }
const CLIPS = T.tapes.clips as unknown as Record<ClipId, { seconds: number; lines: Line[] }>;

const DX = 24, DY = 12, DW = 464, DH = 346;
/** the editor's blocks: S = a sentence, C = a chapter card, F = a fragment, by version */
const VERSIONS: Array<Array<['S' | 'C' | 'F', number]>> = [
  [['S', 0], ['F', 0], ['S', 1], ['F', 1], ['S', 2], ['F', 2]],
  [['C', 0], ['S', 0], ['C', 1], ['S', 1], ['F', 1], ['S', 2], ['F', 2]],
  [['C', 0], ['S', 0], ['C', 1], ['S', 1], ['C', 2], ['S', 2], ['C', 3]]
];
const BLOCK_SECONDS = 1.9;
const EXPORT_SECONDS = 4;
const BUFFER_SECONDS = 4.5;

export class TestimonyApp {
  open = true;
  dirty = true;
  hits: Hit[] = [];
  /** filed acts — os.ts writes them to the ledger (2003's record) */
  onFile?: (id: string) => void;
  /** the page was closed: the story is out — Caleb's message may land */
  onDone?: () => void;
  private stage: Stage = 'prep';
  private topics = 1;
  private clip: ClipId = 'daniel';
  private clipT = 0;
  private playing = false;
  private danielSeen = false;
  private version = 0;
  private previewT = -1;
  private exportT = -1;
  private exported = false;
  private web: 'notice' | 'page' | 'buffer' | 'play' | 'done' = 'notice';
  private webT = 0;
  private tick = 0;
  private hover = '';

  get done(): boolean { return this.web === 'done' && this.stage === 'online'; }

  update(dt: number): void {
    const before = Math.floor(this.tick * 12);
    this.tick += dt;
    let moving = false;
    if (this.stage === 'player' && this.playing) {
      this.clipT += dt; moving = true;
      if (this.clipT >= CLIPS[this.clip].seconds) {
        this.playing = false;
        if (this.clip === 'daniel') this.danielSeen = true;
        this.dirty = true;
      }
    }
    if (this.stage === 'cut' && this.previewT >= 0) {
      this.previewT += dt; moving = true;
      if (this.previewT >= VERSIONS[this.version].length * BLOCK_SECONDS) { this.previewT = -1; this.dirty = true; }
    }
    if (this.stage === 'cut' && this.exportT >= 0 && !this.exported) {
      this.exportT += dt; moving = true;
      if (this.exportT >= EXPORT_SECONDS) { this.exported = true; this.onFile?.('testimony-cut'); this.dirty = true; }
    }
    if (this.stage === 'online' && (this.web === 'buffer' || this.web === 'play')) {
      this.webT += dt; moving = true;
      if (this.web === 'buffer' && this.webT >= BUFFER_SECONDS) { this.web = 'play'; this.webT = 0; }
      else if (this.web === 'play' && this.webT >= VERSIONS[2].length * BLOCK_SECONDS) { this.web = 'done'; this.webT = 0; this.dirty = true; }
    }
    if (moving && Math.floor(this.tick * 12) !== before) this.dirty = true;
  }

  handleMove(x: number, y: number): void {
    const h = this.hits.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    const id = h ? h.id : '';
    if (id !== this.hover) { this.hover = id; this.dirty = true; }
  }

  /** every press inside the window is the window's */
  handleClick(x: number, y: number): boolean {
    const h = this.hits.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    const inside = x >= DX && x <= DX + DW && y >= DY && y <= DY + DH;
    if (!h) return inside;
    this.dirty = true;
    switch (h.id) {
      case 'ts-close': this.open = false; return true;
      case 'ts-next': this.topics = Math.min(T.prep.topics.length, this.topics + 1); return true;
      case 'ts-prep-done': this.onFile?.('testimony-prep'); this.stage = 'release'; return true;
      case 'ts-agree': this.onFile?.('testimony-release'); this.stage = 'tapes'; return true;
      case 'ts-play': if (this.clipT >= CLIPS[this.clip].seconds) this.clipT = 0; this.playing = true; return true;
      case 'ts-stop': this.playing = false; return true;
      case 'ts-folder': this.playing = false; this.stage = 'tapes'; return true;
      case 'ts-send': this.onFile?.('testimony-tapes'); this.stage = 'cut'; this.version = 0; return true;
      case 'ts-preview': this.previewT = 0; return true;
      case 'ts-nextcut': this.version = Math.min(VERSIONS.length - 1, this.version + 1); this.previewT = -1; return true;
      case 'ts-export': this.exportT = 0; this.previewT = -1; return true;
      case 'ts-continue': this.stage = 'online'; this.web = 'notice'; return true;
      case 'ts-see': this.web = 'page'; return true;
      case 'ts-watch': this.web = 'buffer'; this.webT = 0; return true;
      case 'ts-done': this.open = false; this.onFile?.('testimony-online'); this.onDone?.(); return true;
    }
    if (h.id.startsWith('ts-file:')) {
      this.clip = h.id.slice(8) as ClipId; this.clipT = 0; this.playing = true; this.stage = 'player';
      return true;
    }
    return true;
  }

  // ── draw ─────────────────────────────────────────────────────────────────
  draw(ctx: CanvasRenderingContext2D): void {
    this.hits = [];
    this.dirty = false;
    const c = ui.windowFrame(ctx, DX, DY, DW, DH, T.windowTitle, true);
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.beige);
    if (c.closeBox.w > 0) this.hits.push({ ...c.closeBox, id: 'ts-close' });
    switch (this.stage) {
      case 'prep': this.drawPrep(ctx, c); break;
      case 'release': this.drawRelease(ctx, c); break;
      case 'tapes': this.drawTapes(ctx, c); break;
      case 'player': this.drawPlayer(ctx, c); break;
      case 'cut': this.drawCut(ctx, c); break;
      case 'online': this.drawOnline(ctx, c); break;
    }
  }

  private button(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, id: string | null, w?: number): void {
    ui.setFont(ctx, 10);
    const bw = w ?? Math.max(76, Math.ceil(ctx.measureText(label).width) + 18);
    ui.button(ctx, x, y, bw, 20, label, { disabled: !id, hover: !!id && this.hover === id });
    if (id) this.hits.push({ x, y, w: bw, h: 20, id });
  }
  private rightButton(ctx: CanvasRenderingContext2D, c: ui.ContentRect, label: string, id: string | null): void {
    ui.setFont(ctx, 10);
    const bw = Math.max(76, Math.ceil(ctx.measureText(label).width) + 18);
    this.button(ctx, c.x + c.w - 10 - bw, c.y + c.h - 30, label, id, bw);
  }
  private heading(ctx: CanvasRenderingContext2D, c: ui.ContentRect, title: string, intro?: string): void {
    ui.setFont(ctx, 12); ctx.fillStyle = ERA1.navy; ctx.fillText(title, c.x + 12, c.y + 10);
    if (intro) { ui.setFont(ctx, 9); ctx.fillStyle = ERA1.greyDark; ctx.fillText(intro, c.x + 12, c.y + 28); }
  }

  private drawPrep(ctx: CanvasRenderingContext2D, c: ui.ContentRect): void {
    this.heading(ctx, c, T.prep.title, T.prep.intro);
    const filed = entriesByEra().e1.map((e) => e.witness).filter(Boolean);
    const frag = (i: number): string => filed.length ? filed[(i * 3) % filed.length] : T.prep.fallback[i % T.prep.fallback.length];
    for (let i = 0; i < this.topics; i++) {
      const tp = T.prep.topics[i];
      const y = c.y + 46 + i * 41;
      ui.px(ctx, c.x + 12, y - 2, c.w - 24, 1, ERA1.silver);
      ui.setFont(ctx, 10); ctx.fillStyle = ERA1.black; ctx.fillText(`${i + 1}. ${tp.h}`, c.x + 14, y + 2);
      ui.setFont(ctx, 9); ctx.fillStyle = ERA1.greyDark; ctx.fillText(tp.note, c.x + 30, y + 15);
      ui.setFont(ctx, 8); ctx.fillStyle = ERA1.navy;
      const line = `${T.prep.fromFile} ${frag(i)}`;
      ctx.fillText(ui.wrapText(ctx, line, c.w - 60)[0], c.x + 30, y + 27);
    }
    if (this.topics < T.prep.topics.length) this.rightButton(ctx, c, T.prep.next, 'ts-next');
    else this.rightButton(ctx, c, T.prep.done, 'ts-prep-done');
  }

  private drawRelease(ctx: CanvasRenderingContext2D, c: ui.ContentRect): void {
    this.heading(ctx, c, T.release.title, T.release.intro);
    const bx = c.x + 12, by = c.y + 46, bw = c.w - 24;
    ui.px(ctx, bx, by, bw, 88, ERA1.white);
    ui.px(ctx, bx, by, bw, 1, ERA1.grey); ui.px(ctx, bx, by, 1, 88, ERA1.grey);
    const name = ledger.name || 'Daniel';
    T.release.fields.forEach(([k, v], i) => {
      ui.setFont(ctx, 9); ctx.fillStyle = ERA1.greyDark; ctx.fillText(k, bx + 10, by + 10 + i * 19);
      ui.setFont(ctx, 10); ctx.fillStyle = ERA1.black; ctx.fillText(v.replace('{name}', name), bx + 120, by + 9 + i * 19);
    });
    const tick = (x: number, y: number, live: boolean): void => {
      ui.bevel(ctx, x, y, 12, 12, false); ui.px(ctx, x + 2, y + 2, 8, 8, live ? ERA1.white : ERA1.silver);
      ui.px(ctx, x + 3, y + 6, 2, 3, ERA1.black); ui.px(ctx, x + 5, y + 7, 2, 2, ERA1.black); ui.px(ctx, x + 7, y + 4, 2, 3, ERA1.black);
    };
    let y = by + 102;
    for (const u of T.release.uses) { tick(bx + 4, y, true); ui.setFont(ctx, 10); ctx.fillStyle = ERA1.black; ctx.fillText(u, bx + 22, y + 1); y += 20; }
    tick(bx + 24, y, false);
    ui.setFont(ctx, 10); ctx.fillStyle = ERA1.grey; ctx.fillText(T.release.web, bx + 42, y + 1);
    ui.setFont(ctx, 8); ctx.fillText(T.release.webNote, bx + 50 + ctx.measureText(T.release.web).width + 10, y + 3);
    y += 30;
    ui.setFont(ctx, 10); ctx.fillStyle = ERA1.ok; ctx.fillText(T.release.status, bx + 4, y);
    this.rightButton(ctx, c, T.release.agree, 'ts-agree');
  }

  private drawTapes(ctx: CanvasRenderingContext2D, c: ui.ContentRect): void {
    // the folder's icon and name
    ui.px(ctx, c.x + 12, c.y + 10, 16, 12, ERA1.olive); ui.px(ctx, c.x + 12, c.y + 8, 7, 3, ERA1.olive);
    ui.setFont(ctx, 12); ctx.fillStyle = ERA1.navy; ctx.fillText(T.tapes.folder, c.x + 34, c.y + 10);
    ui.setFont(ctx, 9); ctx.fillStyle = ERA1.greyDark; ctx.fillText(T.tapes.hint, c.x + 12, c.y + 30);
    const lx = c.x + 12, lw = c.w - 24;
    ui.px(ctx, lx, c.y + 46, lw, 4 * 26 + 6, ERA1.white);
    T.tapes.files.forEach((f, i) => {
      const y = c.y + 50 + i * 26, id = `ts-file:${f.id}`;
      if (this.hover === id) ui.px(ctx, lx + 2, y, lw - 4, 24, ERA1.tooltip);
      const audio = f.id === 'tone';
      ui.px(ctx, lx + 8, y + 4, 16, 16, audio ? ERA1.teal : ERA1.greyDark);   // a clip / a sound
      if (!audio) { for (let k = 0; k < 3; k++) { ui.px(ctx, lx + 9, y + 6 + k * 5, 2, 2, ERA1.white); ui.px(ctx, lx + 21, y + 6 + k * 5, 2, 2, ERA1.white); } }
      else ui.px(ctx, lx + 13, y + 8, 6, 8, ERA1.white);
      ui.setFont(ctx, 10); ctx.fillStyle = ERA1.black; ctx.fillText(f.name, lx + 32, y + 7);
      ui.setFont(ctx, 9); ctx.fillStyle = ERA1.greyDark; ctx.fillText(f.size, lx + lw - 70, y + 8);
      this.hits.push({ x: lx + 2, y, w: lw - 4, h: 24, id });
    });
    this.rightButton(ctx, c, T.tapes.send, this.danielSeen ? 'ts-send' : null);
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, c: ui.ContentRect): void {
    const file = T.tapes.files.find((f) => f.id === this.clip);
    ui.setFont(ctx, 10); ctx.fillStyle = ERA1.black; ctx.fillText(`${T.tapes.folder} \\ ${file?.name ?? ''}`, c.x + 12, c.y + 8);
    const vw = 400, vh = 216, vx = c.x + Math.round((c.w - vw) / 2), vy = c.y + 24;
    drawFootage(ctx, this.clip, this.clipT, vx, vy, vw, vh, this.tick);
    // the subtitle under the picture: the line being said, and who says it
    const L = CLIPS[this.clip].lines;
    let cur: Line | null = null;
    for (const l of L) if (l.t <= this.clipT) cur = l;
    if (cur && this.clipT - cur.t < 6) {
      ui.setFont(ctx, 10);
      const text = cur.who ? `${cur.who}:  ${cur.text}` : cur.text;
      const tw = ctx.measureText(text).width;
      ui.px(ctx, vx + Math.round((vw - tw) / 2) - 6, vy + vh + 6, Math.ceil(tw) + 12, 16, ERA1.black);
      ctx.fillStyle = cur.who ? ERA1.white : ERA1.silver;
      ctx.fillText(text, vx + Math.round((vw - tw) / 2), vy + vh + 9);
    }
    // the transport: play / stop, and back to the folder
    const by = c.y + c.h - 30;
    this.button(ctx, c.x + 12, by, this.playing ? T.tapes.stop : T.tapes.play, this.playing ? 'ts-stop' : 'ts-play', 70);
    this.button(ctx, c.x + 88, by, T.tapes.back, 'ts-folder', 70);
    const total = CLIPS[this.clip].seconds;
    const bx = c.x + 168, bw = c.w - 180;
    ui.px(ctx, bx, by + 7, bw, 6, ERA1.black);
    ui.px(ctx, bx, by + 7, Math.round(bw * Math.min(1, this.clipT / total)), 6, ERA1.navy);
  }

  private drawCut(ctx: CanvasRenderingContext2D, c: ui.ContentRect): void {
    this.heading(ctx, c, T.cut.title.replace('{v}', String(this.version + 1)));
    const blocks = VERSIONS[this.version];
    // the preview monitor
    const px0 = c.x + 12, py0 = c.y + 30, pw = 252, ph = 150;
    ui.px(ctx, px0 - 1, py0 - 1, pw + 2, ph + 2, ERA1.greyDark);
    const playing = this.previewT >= 0;
    const bi = playing ? Math.min(blocks.length - 1, Math.floor(this.previewT / BLOCK_SECONDS)) : -1;
    drawBlock(ctx, bi >= 0 ? blocks[bi] : ['S', 0], px0, py0, pw, ph, this.tick, !playing);
    // the unused bin
    const ux = px0 + pw + 12, uw = c.x + c.w - 12 - ux;
    ui.setFont(ctx, 9); ctx.fillStyle = ERA1.greyDark; ctx.fillText(T.cut.unusedLabel, ux, py0);
    ui.px(ctx, ux, py0 + 14, uw, ph - 14, ERA1.white);
    const used = new Set(blocks.filter((b) => b[0] === 'F').map((b) => b[1]));
    let uy = py0 + 20;
    T.cut.fragments.forEach((f, i) => {
      if (used.has(i)) return;
      ui.px(ctx, ux + 6, uy, uw - 12, 18, ERA1.silver);
      ui.setFont(ctx, 9); ctx.fillStyle = ERA1.black; ctx.fillText(f, ux + 10, uy + 4);
      uy += 22;
    });
    // the timeline
    const ty = py0 + ph + 14;
    ui.setFont(ctx, 9); ctx.fillStyle = ERA1.greyDark; ctx.fillText(T.cut.timelineLabel, px0, ty);
    const tx0 = px0, tw = c.w - 24, bw = Math.floor(tw / blocks.length);
    blocks.forEach((b, i) => {
      const x = tx0 + i * bw, y = ty + 14;
      const col = b[0] === 'C' ? ERA1.navy : b[0] === 'F' ? ERA1.silver : ERA1.teal;
      ui.px(ctx, x + 1, y, bw - 2, 30, col);
      if (i === bi) ui.px(ctx, x + 1, y + 30, bw - 2, 3, ERA1.warn);
      ui.setFont(ctx, 8); ctx.fillStyle = b[0] === 'F' ? ERA1.black : ERA1.white;
      const label = b[0] === 'C' ? T.cut.chapters[b[1]] : b[0] === 'F' ? T.cut.fragments[b[1]] : `S${b[1] + 1}`;
      ctx.fillText(ui.wrapText(ctx, label, bw - 6)[0], x + 4, y + 10);
    });
    ui.setFont(ctx, 8); ctx.fillStyle = ERA1.greyDark; ctx.fillText(T.cut.note, px0, ty + 52);
    // the row: Preview · Next cut · Export (or the burn, or Continue)
    const by = c.y + c.h - 30;
    if (this.exported) {
      ui.setFont(ctx, 10); ctx.fillStyle = ERA1.ok; ctx.fillText(T.cut.exported, c.x + 12, by + 5);
      this.rightButton(ctx, c, T.cut.continue, 'ts-continue');
    } else if (this.exportT >= 0) {
      const k = Math.min(1, this.exportT / EXPORT_SECONDS);
      ui.setFont(ctx, 10); ctx.fillStyle = ERA1.black; ctx.fillText(T.cut.burning.replace('{p}', String(Math.floor(k * 100))), c.x + 12, by + 5);
      ui.px(ctx, c.x + 180, by + 6, c.w - 200, 8, ERA1.black);
      ui.px(ctx, c.x + 180, by + 6, Math.round((c.w - 200) * k), 8, ERA1.navy);
    } else {
      this.button(ctx, c.x + 12, by, T.cut.preview, 'ts-preview', 80);
      this.button(ctx, c.x + 98, by, T.cut.nextCut, this.version < VERSIONS.length - 1 ? 'ts-nextcut' : null, 80);
      this.rightButton(ctx, c, T.cut.export, this.version === VERSIONS.length - 1 ? 'ts-export' : null);
    }
  }

  private drawOnline(ctx: CanvasRenderingContext2D, c: ui.ContentRect): void {
    const O = T.online;
    if (this.web === 'notice') {
      const nx = c.x + Math.round((c.w - 300) / 2), ny = c.y + 110;
      ui.bevel(ctx, nx, ny, 300, 80, true);
      ui.px(ctx, nx + 2, ny + 2, 296, 14, ERA1.navy);
      ui.setFont(ctx, 9); ctx.fillStyle = ERA1.white; ctx.fillText('Restorify Media', nx + 6, ny + 4);
      ui.setFont(ctx, 11); ctx.fillStyle = ERA1.black; ctx.fillText(O.notice, nx + 14, ny + 28);
      this.button(ctx, nx + 300 - 90, ny + 50, O.see, 'ts-see', 80);
      return;
    }
    // a 2003 browser: the address, then the ministry's page
    ui.px(ctx, c.x + 4, c.y + 4, c.w - 8, 18, ERA1.white);
    ui.px(ctx, c.x + 4, c.y + 4, c.w - 8, 1, ERA1.grey);
    ui.setFont(ctx, 9); ctx.fillStyle = ERA1.black; ctx.fillText(O.address, c.x + 10, c.y + 8);
    const px0 = c.x + 4, py0 = c.y + 26, pw = c.w - 8, ph = c.h - 62;
    ui.px(ctx, px0, py0, pw, ph, ERA1.white);
    ui.px(ctx, px0, py0, pw, 26, F.banner);
    ui.setFont(ctx, 14); ctx.fillStyle = F.bannerInk; ctx.fillText(O.header, px0 + 12, py0 + 6);
    ui.setFont(ctx, 12); ctx.fillStyle = ERA1.navy; ctx.fillText(O.storyTitle, px0 + 12, py0 + 36);
    // the picture: a still, or the player
    const vx = px0 + 12, vy = py0 + 56, vw = 176, vh = 132;
    if (this.web === 'page' || this.web === 'done') drawFootage(ctx, 'daniel', 9, vx, vy, vw, vh, 0, true);
    else if (this.web === 'buffer') {
      ui.px(ctx, vx, vy, vw, vh, ERA1.black);
      ui.setFont(ctx, 9); ctx.fillStyle = ERA1.silver;
      ctx.fillText(O.buffering.replace('{p}', String(Math.min(100, Math.floor(this.webT / BUFFER_SECONDS * 100)))), vx + 34, vy + 60);
    } else {
      const bi = Math.min(VERSIONS[2].length - 1, Math.floor(this.webT / BLOCK_SECONDS));
      drawBlock(ctx, VERSIONS[2][bi], vx, vy, vw, vh, this.tick, false, true);
    }
    // the words beside it
    const tx = vx + vw + 14, tw = px0 + pw - 12 - tx;
    ui.setFont(ctx, 10); ctx.fillStyle = ERA1.black;
    let y = vy + 2;
    for (const l of ui.wrapText(ctx, O.quote, tw)) { ctx.fillText(l, tx, y); y += 13; }
    y += 6;
    ui.setFont(ctx, 9); ctx.fillStyle = ERA1.greyDark;
    for (const l of ui.wrapText(ctx, O.para, tw)) { ctx.fillText(l, tx, y); y += 12; }
    y += 10;
    const link = (label: string, id: string | null): void => {
      ui.setFont(ctx, 9); ctx.fillStyle = id ? ERA1.navy : ERA1.grey;
      ctx.fillText(label, tx, y); const w = ctx.measureText(label).width;
      ui.px(ctx, tx, y + 10, Math.ceil(w), 1, id ? ERA1.navy : ERA1.grey);
      if (id) this.hits.push({ x: tx - 2, y: y - 2, w: Math.ceil(w) + 4, h: 14, id });
      y += 16;
    };
    const watchable = this.web === 'page';
    link(O.watch56, watchable ? 'ts-watch' : null);
    link(O.watchBB, watchable ? 'ts-watch' : null);
    ui.setFont(ctx, 8); ctx.fillStyle = ERA1.grey; ctx.fillText(O.requires, tx, y); y += 18;
    if (this.web === 'done') {
      ui.setFont(ctx, 10); ctx.fillStyle = ERA1.warnDark;
      for (const l of ui.wrapText(ctx, O.start, px0 + pw - 12 - vx)) { ctx.fillText(l, vx, vy + vh + 12); }
      ui.setFont(ctx, 9); ctx.fillStyle = ERA1.greyDark;
      ctx.fillText(O.count.replace('{n}', '3'), vx, vy + vh + 28);
    }
    this.rightButton(ctx, c, O.close, this.web === 'done' ? 'ts-done' : null);
  }
}

// ── the footage ──────────────────────────────────────────────────────────────
/** a person, faceless as every body in the piece: trousers, a shirt, a head, hair. `stand` 0 = seated, 1 = standing */
function person(ctx: CanvasRenderingContext2D, cx: number, floorY: number, s: number, shirt: string, trousers: string, stand: number, skin: string): void {
  const legH = Math.round((stand * 34 + (1 - stand) * 16) * s);
  const torsoH = Math.round(36 * s), torsoW = Math.round(26 * s), headW = Math.round(15 * s), headH = Math.round(17 * s);
  const hip = floorY - legH - Math.round((1 - stand) * 20 * s);
  ui.px(ctx, cx - Math.round(10 * s), hip, Math.round(8 * s), legH + Math.round((1 - stand) * 20 * s), trousers);
  ui.px(ctx, cx + Math.round(2 * s), hip, Math.round(8 * s), legH + Math.round((1 - stand) * 20 * s), trousers);
  if (stand < 0.5) ui.px(ctx, cx - Math.round(12 * s), hip, Math.round(26 * s), Math.round(8 * s), trousers);   // the lap
  ui.px(ctx, cx - Math.round(torsoW / 2), hip - torsoH, torsoW, torsoH, shirt);
  ui.px(ctx, cx - Math.round(headW / 2), hip - torsoH - headH - 1, headW, headH, skin);
  ui.px(ctx, cx - Math.round(headW / 2), hip - torsoH - headH - 1, headW, Math.round(5 * s), F.hair);
}

/** the camcorder's picture of the hall at time t — the clip's own staging, then the camera's overlays */
function drawFootage(ctx: CanvasRenderingContext2D, clip: ClipId, t: number, x: number, y: number, w: number, h: number, tick: number, still = false): void {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (clip === 'tone') {
    ui.px(ctx, x, y, w, h, F.black);
    ui.setFont(ctx, 9); ctx.fillStyle = F.osd; ctx.fillText(T.tapes.toneLabel, x + 14, y + h / 2 - 14);
    for (let i = 0; i < 24; i++) {
      const lv = Math.abs(Math.sin(tick * 3 + i * 1.7)) * 0.25 + 0.05;
      ui.px(ctx, x + 14 + i * 8, y + h / 2 + 20 - Math.round(lv * 30), 5, Math.round(lv * 30), ERA1.ok);
    }
    ctx.restore();
    return;
  }
  const s = w / 400;
  // after "cut" the camera is left running and has been knocked a little
  const bump = clip === 'daniel' && t > 17 ? Math.round(6 * s) : 0;
  const pan = clip === 'broll' ? Math.round(-t * 7 * s) : 0;
  const ox = x + bump + pan, floorY = y + Math.round(h * 0.78) + Math.round(bump / 2);
  ui.px(ctx, x, y, w, h, F.wall);
  ui.px(ctx, x, y + Math.round(h * 0.06), w, Math.round(h * 0.03), F.wallHi);
  ui.px(ctx, x, floorY, w, y + h - floorY, F.floor);
  ui.px(ctx, x, floorY, w, 2, F.floorHi);
  // the banner on the back wall
  const bw = Math.round(220 * s), bx = ox + Math.round(w * 0.5) - Math.round(bw / 2), by = y + Math.round(h * 0.14);
  ui.px(ctx, bx, by, bw, Math.round(22 * s), F.banner);
  ui.setFont(ctx, Math.max(7, Math.round(10 * s)));
  ctx.fillStyle = F.bannerInk;
  const bt = T.tapes.banner, btw = ctx.measureText(bt).width;
  ctx.fillText(bt, bx + Math.round((bw - btw) / 2), by + Math.round(5 * s));
  // the light stand and its softbox, left
  ui.px(ctx, ox + Math.round(56 * s), y + Math.round(h * 0.3), Math.round(3 * s), floorY - y - Math.round(h * 0.3), F.stand);
  ui.px(ctx, ox + Math.round(38 * s), y + Math.round(h * 0.22), Math.round(40 * s), Math.round(30 * s), F.softbox);
  if (clip === 'broll') {
    for (let i = 0; i < 7; i++) {   // the chairs set out in rows
      const cx = ox + Math.round((60 + i * 60) * s);
      ui.px(ctx, cx, floorY - Math.round(30 * s), Math.round(24 * s), Math.round(4 * s), F.chair);
      ui.px(ctx, cx, floorY - Math.round(52 * s), Math.round(4 * s), Math.round(52 * s), F.chair);
    }
  } else {
    // the chair, the subject's
    const chx = ox + Math.round(w * 0.42);
    ui.px(ctx, chx - Math.round(16 * s), floorY - Math.round(26 * s), Math.round(32 * s), Math.round(5 * s), F.chair);
    ui.px(ctx, chx + Math.round(12 * s), floorY - Math.round(64 * s), Math.round(5 * s), Math.round(64 * s), F.chair);
    if (clip === 'daniel') {
      const stand = t < 18 ? 0 : Math.min(1, (t - 18) / 1.6);
      person(ctx, chx, floorY, s, F.danielShirt, F.danielTrousers, stand, F.skin);
      if (t > 21) {   // Caleb comes in from the right, looking for where to sit
        const k = Math.min(1, (t - 21) / 3.5);
        const e = k * k * (3 - 2 * k);
        const cx = Math.round(x + w + 30 * s - (x + w + 30 * s - (ox + w * 0.68)) * e);
        const step = k < 1 ? Math.round(Math.abs(Math.sin(t * 7)) * 2 * s) : 0;
        person(ctx, cx, floorY - step, s, F.calebJacket, F.calebTrousers, 1, F.skin2);
      }
    } else if (clip === 'caleb') {
      person(ctx, chx, floorY, s, F.calebJacket, F.calebTrousers, 0, F.skin2);
    }
  }
  // the camera's overlays: REC, the tape, the timecode, and the lines of a video picture
  if (!still) {
    ui.setFont(ctx, Math.max(7, Math.round(9 * s)));
    if (Math.floor(tick * 2) % 2 === 0) { ui.px(ctx, x + 8, y + 9, Math.round(6 * s) + 1, Math.round(6 * s) + 1, F.rec); }
    ctx.fillStyle = F.osd; ctx.fillText('REC', x + 18, y + 7);
    const tw = ctx.measureText(T.tapes.tape).width;
    ctx.fillText(T.tapes.tape, x + w - 10 - tw, y + 7);
    const base = clip === 'daniel' ? 252 : clip === 'caleb' ? 301 : 340;
    const sec = base + Math.floor(t), fr = Math.floor((t % 1) * 25);
    const tc = `00:${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}:${String(fr).padStart(2, '0')}`;
    const tcw = ctx.measureText(tc).width;
    ctx.fillText(tc, x + w - 10 - tcw, y + h - 16);
    ctx.fillText('SP', x + 10, y + h - 16);
  }
  const was = ctx.globalAlpha;
  ctx.globalAlpha = was * 0.12;
  for (let yy = y; yy < y + h; yy += 3) ui.px(ctx, x, yy, w, 1, F.scan);
  ctx.globalAlpha = was;
  ctx.restore();
}

/** one block of the edit: a chapter card, a sentence over his take, or a fragment */
function drawBlock(ctx: CanvasRenderingContext2D, b: ['S' | 'C' | 'F', number], x: number, y: number, w: number, h: number, tick: number, idle: boolean, web = false): void {
  if (b[0] === 'C') {
    ui.px(ctx, x, y, w, h, ERA1.black);
    ui.setFont(ctx, web ? 12 : 16);
    ctx.fillStyle = ERA1.white;
    const t = T.cut.chapters[b[1]], tw = ctx.measureText(t).width;
    ctx.fillText(t, x + Math.round((w - tw) / 2), y + Math.round(h / 2) - 8);
    return;
  }
  const at = b[0] === 'S' ? [4, 8.4, 12.8][b[1]] : [2, 6, 26][b[1]];
  drawFootage(ctx, 'daniel', idle ? 9 : at, x, y, w, h, tick, true);
  if (idle) return;
  const text = b[0] === 'S' ? T.cut.sentences[b[1]] : T.cut.fragments[b[1]];
  ui.setFont(ctx, web ? 8 : 9);
  const rows = ui.wrapText(ctx, text, w - 16);
  rows.forEach((r, i) => {
    const rw = ctx.measureText(r).width;
    ui.px(ctx, x + Math.round((w - rw) / 2) - 4, y + h - 14 - (rows.length - i) * 12, Math.ceil(rw) + 8, 12, ERA1.black);
    ctx.fillStyle = ERA1.white;
    ctx.fillText(r, x + Math.round((w - rw) / 2), y + h - 12 - (rows.length - i) * 12);
  });
  if (web) {   // a .wmv at 56k: blocks of picture
    const was = ctx.globalAlpha; ctx.globalAlpha = was * 0.18;
    for (let yy = y; yy < y + h; yy += 8) for (let xx = x + ((yy / 8) % 2) * 8; xx < x + w; xx += 16) ui.px(ctx, xx, yy, 8, 8, ERA1.black);
    ctx.globalAlpha = was;
  }
}
