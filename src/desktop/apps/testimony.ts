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
 *   ⚑ S207 (his ruling): ONE media object — the tapes are the raw shoot of Restorify's infomercial, 'Discover the New
 *   You'; the editor cuts by the ad's own structure (BEFORE · THE PROGRAM · AFTER · CALL NOW).
 *   4 CUT      — the Story Editor assembles it: chapter cards between his sentences (was CONFUSION → SURRENDER → CHANGE →
 *                HOPE), the rest into Unused media ("I still…", "some days…", "…Caleb?"). He can only press Next cut
 *                and Export. (2016's "Cut the Story" is this, industrialised.)
 *   5 ONLINE   — "Your testimony is reaching people": his page on the ministry's site, a .wmv that buffers on dial-up,
 *                "Are you struggling too? Start here →", and the week's count of applications started from it.
 * Then — and only then — Caleb's first message lands: "saw they put yours up." (os.ts, s2_caleb.json).
 *
 * Drawn in 2003's desktop chrome (ERA1's, as Restorify's windows are); the footage in theme/calendar.ts's FOOTAGE.
 */
import { isSpeedrun } from '../../state/cut';
import { ERA1 } from '../theme/era1';
import * as ui from '../theme/chrome';
import { FOOTAGE as F } from '../theme/calendar';
import { entriesByEra } from '../../witness/record';
import { ledger } from '../../state/ledger';
import { playLoop, stopClip } from '../../audio/tapeAudio';
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

  /** ⚑ S223 cloud / W1-D7 (walkthrough 1: "The helper keeps showing lines while your story's videos play") — true
   *  while a picture of his story is MOVING: a clip on the player, the editor's preview or its export, the page's
   *  dial-up buffer and its video. os.ts `fictionPlaying` reads it so the frame's helper stays quiet over all of it. */
  get playbackActive(): boolean {
    if (!this.open) return false;
    return (this.stage === 'player' && this.playing)
      || (this.stage === 'cut' && (this.previewT >= 0 || (this.exportT >= 0 && !this.exported)))
      || (this.stage === 'online' && (this.web === 'buffer' || this.web === 'play'));
  }

  /** ⚑ W1-D10 (walkthrough 1: "the room tone is not working") — ROOM_TONE was a waveform with no sound, and the
   *  takes were as silent. The hall's tone now plays while a clip plays: full for the tone file, under the takes
   *  as what the room sounds like behind them (data/strings/captions.json names it). */
  private hall: HTMLAudioElement | null = null;
  private syncHall(): void {
    const want = this.open && this.stage === 'player' && this.playing;
    if (!want) { if (this.hall) { stopClip(this.hall); this.hall = null; } return; }
    if (!this.hall) {
      this.hall = playLoop('testimony_hall_tone_2003.mp3');
      if (this.hall) this.hall.volume = this.clip === 'tone' ? 0.8 : 0.4;
    }
  }

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
    this.syncHall();
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
    const r = this.press(x, y);
    this.syncHall();   // a press may start, stop or close a clip — the hall follows at once, not on the next frame
    return r;
  }
  private press(x: number, y: number): boolean {
    const h = this.hits.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    const inside = x >= DX && x <= DX + DW && y >= DY && y <= DY + DH;
    if (!h) return inside;
    this.dirty = true;
    switch (h.id) {
      case 'ts-close': this.open = false; return true;
      case 'ts-next': this.topics = Math.min(T.prep.topics.length, this.topics + 1); return true;
      case 'ts-prep-done': this.onFile?.('testimony-prep'); this.stage = 'release'; return true;
      case 'ts-agree':
        this.onFile?.('testimony-release');
        // ⚑ S227 — the Speedrun Version: the programme assembles his story itself (the tapes and the edit are its
        //   work, W1-D11 "too confusing and unnecessary"); the same three filings, then straight to his story online
        if (isSpeedrun()) { this.onFile?.('testimony-tapes'); this.onFile?.('testimony-cut'); this.exported = true; this.stage = 'online'; this.web = 'notice'; return true; }
        this.stage = 'tapes'; return true;
      case 'ts-play': if (this.clipT >= CLIPS[this.clip].seconds) this.clipT = 0; this.playing = true; return true;
      case 'ts-stop': this.playing = false; return true;
      case 'ts-folder': this.playing = false; this.stage = 'tapes'; return true;
      case 'ts-send':
        this.onFile?.('testimony-tapes');
        // ⚑ S227 / W1-D11 (walkthrough 1, his: "The editing system is too confusing and unnecessary. Submit the videos
        //   and get the final version.") — the programme makes the cut itself: the same filing, then his story online.
        //   The editor (stage 'cut') stays in the file, unreached.
        this.onFile?.('testimony-cut'); this.exported = true; this.stage = 'online'; this.web = 'notice'; return true;
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
    // ⚑ W1-D6 (walkthrough 1: the story preparation had text cut off) — the intro wraps to the window, it never runs off it
    if (intro) { ui.setFont(ctx, 9); ctx.fillStyle = ERA1.greyDark; ui.wrapText(ctx, intro, c.w - 24).forEach((ln, i) => ctx.fillText(ln, c.x + 12, c.y + 28 + i * 10)); }
  }

  private drawPrep(ctx: CanvasRenderingContext2D, c: ui.ContentRect): void {
    this.heading(ctx, c, T.prep.title, T.prep.intro);
    const entries = entriesByEra().e1.filter((e) => e.witness);
    const filed = entries.map((e) => e.witness);
    // ⚑ S209h / ERA03-11 — each topic takes the file line that MEANS it (the institution building his story
    //   out of what it holds), first unused match in order; the old arithmetic only when nothing matches
    const WANT: string[][] = [
      ['profile', 'diary'],                // BEFORE
      ['pledge', 'tapes', 'kit'],          // WHAT I BELIEVED
      ['channel', 'referral'],             // TURNING POINT
      ['placement', 'tapes', 'provotype'], // WHAT CHANGED
      ['placement', 'arrival', 'kit'],     // WHERE I AM NOW
      ['referral', 'channel']              // TO SOMEONE STRUGGLING
    ];
    const used = new Set<number>();
    const picks = WANT.map((kinds) => {
      for (const k of kinds) {
        const j = entries.findIndex((e, n) => e.kind === k && !used.has(n));
        if (j >= 0) { used.add(j); return entries[j].witness; }
      }
      return null;
    });
    const frag = (i: number): string => picks[i] ?? (filed.length ? filed[(i * 3) % filed.length] : T.prep.fallback[i % T.prep.fallback.length]);
    // the filed line wraps (it used to keep only its first wrapped line, and the rest was simply gone);
    // the rows are a little tighter and the button sits lower, so a second line has room
    for (let i = 0; i < this.topics; i++) {
      const tp = T.prep.topics[i];
      const y = c.y + 50 + i * 40;
      ui.px(ctx, c.x + 12, y - 2, c.w - 24, 1, ERA1.silver);
      ui.setFont(ctx, 10); ctx.fillStyle = ERA1.black; ctx.fillText(`${i + 1}. ${tp.h}`, c.x + 14, y + 1);
      ui.setFont(ctx, 9); ctx.fillStyle = ERA1.greyDark; ctx.fillText(tp.note, c.x + 30, y + 12);
      ui.setFont(ctx, 8); ctx.fillStyle = ERA1.navy;
      ui.wrapText(ctx, `${T.prep.fromFile} ${frag(i)}`, c.w - 60).slice(0, 2).forEach((ln, k) => ctx.fillText(ln, c.x + 30, y + 23 + k * 9));
    }
    const label = this.topics < T.prep.topics.length ? T.prep.next : T.prep.done;
    const bid = this.topics < T.prep.topics.length ? 'ts-next' : 'ts-prep-done';
    ui.setFont(ctx, 10);
    const bw = Math.max(76, Math.ceil(ctx.measureText(label).width) + 18);
    this.button(ctx, c.x + c.w - 10 - bw, c.y + c.h - 32, label, bid, bw);
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
    // ⚑ S208 / A9 (REVIEW_ROUND_5, ERA03-10) — the still is the play button too, as a 2003 page's was: a big ▶ on it,
    //   the whole picture pressable, so the beat no longer hangs on finding two 9 px links
    if (this.web === 'page') {
      const cx = vx + Math.round(vw / 2), cy = vy + Math.round(vh / 2);
      ui.px(ctx, cx - 20, cy - 16, 40, 32, ERA1.black);
      for (let r = 0; r < 20; r++) ui.px(ctx, cx - 7, cy - 10 + r, Math.round(16 * (1 - Math.abs(r - 10) / 10)) + 1, 1, ERA1.white);
      this.hits.push({ x: vx, y: vy, w: vw, h: vh, id: 'ts-watch' });
    }
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
/**
 * ⚑ S207 — TAPE 04 IS THE AD'S SHOOT (his ruling, 2026-10-01: merge — "the documentary is one thing and the infomercial
 * another… a clash of ideas"; and of S206's drawing: "these new images of the tape aren't great"). Daniel is filmed for
 * Restorify's own infomercial, "Discover the New You": Tape 04 is the RAW footage of its ACTUAL PARTICIPANT segment.
 * So it is drawn in the ad's own language (src/desktop/apps/netvision.ts, the testimony set he called "awesome"):
 * the BEFORE set — grey flats, the window, one hard light from above — and black silhouettes built from limbs, a
 * seated body's knees to camera, a head that drops. Raw, it shows what the cut ad hides: the edges of the flats, the
 * dark studio around them, the lamp on its stand, the boom dipping in. At "cut" the hard light goes off and the flat
 * work lights come on; Caleb walks in out of the dark of the studio. Then B-roll of the AFTER set being dressed.
 */
interface Pose { scale: number; seated?: boolean; lean?: number; headDrop?: number; turn?: number; armSpread?: number; armLift?: number; handsFolded?: boolean; reach?: number; step?: number; color?: string }
/** the ad's limb: a run of square stamps — pixel-true, as the ad draws them */
function limb(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, thick: number, color: string): void {
  const steps = Math.max(Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))), 1);
  const h = Math.floor(thick / 2);
  ctx.fillStyle = color;
  for (let i = 0; i <= steps; i++) ctx.fillRect(Math.round(x0 + (x1 - x0) * (i / steps)) - h, Math.round(y0 + (y1 - y0) * (i / steps)) - h, thick, thick);
}
/** the ad's figure (netvision.ts drawFigure), with a reach for the end of the outtake */
function figure(ctx: CanvasRenderingContext2D, cx: number, baseY: number, p: Pose): void {
  const s = p.scale, col = p.color ?? ERA1.black, lean = (p.lean ?? 0) * s, drop = (p.headDrop ?? 0) * s;
  const spread = p.armSpread ?? 0, lift = p.armLift ?? 0, turn = p.turn ?? 1;
  const t = (n: number): number => Math.max(2, Math.round(n * s));
  const hipY = Math.round(baseY - (p.seated ? 22 : 30) * s);
  const shoulderY = Math.round(hipY - 24 * s + drop);
  const shoulderX = Math.round(cx + lean);
  const half = 10 * s * (0.34 + 0.66 * turn);
  if (p.seated) {
    const kneeY = hipY + 3 * s;
    for (const side of [-1, 1]) { const kx = cx + 17 * s + side * 4 * s; limb(ctx, cx + side * 4 * s, hipY, kx, kneeY, t(7), col); limb(ctx, kx, kneeY, kx - 3 * s, baseY, t(6), col); }
  } else {
    const st = p.step ?? 0;
    for (const side of [-1, 1]) limb(ctx, cx + side * 3 * s, hipY, cx + side * (4 + 2 * turn) * s + side * st * 4 * s, baseY, t(7), col);
  }
  limb(ctx, cx, hipY, shoulderX, shoulderY, t(11), col);
  limb(ctx, shoulderX - half, shoulderY, shoulderX + half, shoulderY, t(7), col);
  for (const side of [-1, 1]) {
    const sx = shoulderX + side * half;
    let ex: number, ey: number, hx: number, hy: number;
    if (p.handsFolded) { ex = sx + side * 2 * s; ey = shoulderY + 12 * s; hx = cx + side * 3 * s; hy = hipY - 2 * s; }
    else { ex = sx + side * (2 + spread * 12) * s; ey = shoulderY + (12 - lift * 9) * s; hx = ex + side * (2 + spread * 14) * s; hy = ey + (11 - lift * 20) * s; }
    if (p.reach && side === 1) { ex = sx + 8 * s * p.reach; ey = shoulderY + 9 * s; hx = ex + 10 * s * p.reach; hy = ey + 1 * s; }
    limb(ctx, sx, shoulderY + s, ex, ey, t(6), col);
    limb(ctx, ex, ey, hx, hy, t(5), col);
  }
  const headR = 7 * s, hx0 = Math.round(shoulderX + lean * 0.35), hy0 = Math.round(shoulderY - 9 * s);
  limb(ctx, hx0, hy0 + headR, shoulderX, shoulderY, t(4), col);
  ctx.fillStyle = col; ctx.beginPath();
  ctx.ellipse(hx0, hy0, Math.max(2, Math.round(headR * (0.78 + 0.22 * turn))), Math.max(2, Math.round(headR * 1.08)), 0, 0, Math.PI * 2); ctx.fill();
}
const ease = (k: number): number => { const c = Math.max(0, Math.min(1, k)); return c * c * (3 - 2 * c); };

/** the camcorder's raw picture of the shoot at time t, then the camera's own words */
export function drawFootage(ctx: CanvasRenderingContext2D, clip: ClipId, t: number, x: number, y: number, w: number, h: number, tick: number, still = false): void {
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
  const s = w / 400, S = (n: number): number => Math.round(n * s);
  const danielClip = clip === 'daniel';
  const hardOn = danielClip ? 1 - ease((t - 16.9) / 0.3) : 1;     // the set's one hard light; off at "cut"
  const workOn = danielClip ? ease((t - 17.6) / 0.6) : 0;          // the studio's flat work lights, after
  const pan = clip === 'broll' ? -t * 6 * s : 0;
  const ox = Math.round(x + pan);
  // the studio: dark, and the set built in the middle of it
  ui.px(ctx, x, y, w, h, F.black);
  ui.px(ctx, x, y + Math.round(h * 0.86), w, h, ERA1.greyDark);   // the studio floor
  const setX = ox + S(70), setW = S(260), setTop = y + S(14), floorY = y + Math.round(h * 0.82);
  if (clip === 'broll') {
    // the AFTER set, being dressed: warm flats, the olive floor, the family-shaped shadows going up on the wall
    ui.px(ctx, setX, setTop, setW, floorY - setTop, ERA1.paper);
    ui.px(ctx, setX, setTop, setW, S(30), ERA1.beige);
    ui.px(ctx, setX, floorY, setW, S(18), ERA1.olive);
    figure(ctx, setX + S(70), floorY + 2, { scale: 0.62 * s * 1.6, color: ERA1.silver, turn: 0.8, armSpread: 0.12 });
    if (t > 5) figure(ctx, setX + S(190), floorY + 2, { scale: 0.46 * s * 1.6, color: ERA1.silver, turn: 0.8, armSpread: 0.1 });
    ui.px(ctx, setX + setW + S(10), y + S(40), S(3), floorY - y - S(40), ERA1.grey);   // a stand at the edge
  } else {
    // the BEFORE set: grey flats, a darker band above, the window — the ad's own, seen raw
    ui.px(ctx, setX, setTop, setW, floorY - setTop, ERA1.grey);
    ui.px(ctx, setX, setTop, setW, S(34), ERA1.greyDark);
    ui.px(ctx, setX, floorY, setW, S(18), ERA1.greyDark);
    const wx = setX + S(170), wy = setTop + S(46), ww = S(64), wh = S(54);
    ui.px(ctx, wx - S(3), wy - S(3), ww + S(6), wh + S(6), ERA1.greyDark);
    ui.px(ctx, wx, wy, ww, wh, ERA1.silver);
    ui.px(ctx, wx + Math.round(ww / 2) - 1, wy, S(2), wh, ERA1.greyDark);
    ui.px(ctx, wx, wy + Math.round(wh / 2) - 1, ww, S(2), ERA1.greyDark);
    // the flats' raw edges: their bracing, which the cut ad crops away with black bars
    ui.px(ctx, setX - S(2), setTop, S(2), floorY - setTop + S(18), ERA1.silver);
    ui.px(ctx, setX + setW, setTop, S(2), floorY - setTop + S(18), ERA1.silver);
    // the hard light: its lamp on a stand outside the set, and its cone straight down on the stool
    ui.px(ctx, ox + S(24), y + S(20), S(3), floorY - y, ERA1.grey);
    ui.px(ctx, ox + S(14), y + S(14), S(22), S(10), hardOn > 0.5 ? ERA1.tooltip : ERA1.greyDark);
    const stoolX = setX + S(96);
    if (hardOn > 0) {
      const was = ctx.globalAlpha; ctx.globalAlpha = was * 0.16 * hardOn;
      for (let i = 0; i < 20; i++) { const ww2 = S(10 + i * 2), yy = setTop + i * Math.round((floorY - setTop) / 20); ui.px(ctx, stoolX - Math.round(ww2 / 2), yy, ww2, Math.ceil((floorY - setTop) / 20) + 1, ERA1.silver); }
      ctx.globalAlpha = was;
    }
    // the boom, dipping in over the subject while he talks; lifted away after cut
    const boomY = y + S(danielClip && t > 17.4 ? -40 : 6) + Math.round(Math.sin(tick * 0.9) * 2);
    ui.px(ctx, x, boomY, stoolX - x - S(6), S(3), ERA1.grey);
    ui.px(ctx, stoolX - S(10), boomY - S(3), S(16), S(9), ERA1.greyDark);
    // the stool
    ui.px(ctx, stoolX - S(10), floorY - S(20), S(22), S(3), ERA1.greyDark);
    ui.px(ctx, stoolX - S(8), floorY - S(17), S(2), S(17), ERA1.greyDark); ui.px(ctx, stoolX + S(8), floorY - S(17), S(2), S(17), ERA1.greyDark);
    const breath = (Math.sin(tick * 1.15) + 1) / 2;
    const sc = 1.25 * s;
    if (danielClip) {
      // DANIEL: slumped as the ad's BEFORE wants him; the template's lines; "cut"; he breathes out, stands
      const seated = t < 18.4;
      const reach = t > 33.2 && t < 35.6 ? ease((t - 33.2) / 0.5) : 0;
      const turnTo = t > 25.6 ? ease((t - 25.6) / 0.8) : 0;
      figure(ctx, stoolX + (seated ? 0 : S(6)), floorY + 2, {
        scale: sc, seated, lean: seated ? (t < 12.2 ? 7 : 5) : 2 + turnTo * 3, headDrop: seated ? (t < 3.4 ? 8 : t < 12.2 ? 6 : t < 16.4 ? 4 : 9) + breath * 1.2 : (t < 26 ? 3 : 0),
        turn: seated ? 0.7 : 0.6 + turnTo * 0.4, handsFolded: seated && t < 7.8, armSpread: seated && t >= 12.2 && t < 16.4 ? 0.25 : 0, reach
      });
      if (t > 21.0) {   // Caleb, out of the dark of the studio, looking for where to sit
        const k = ease((t - 21.0) / 3.6);
        const fromX = x + w + S(20), toX = stoolX + S(80) - (t > 30.8 ? ease((t - 30.8) / 1.0) * S(14) : 0);
        const cx = Math.round(fromX + (toX - fromX) * k);
        figure(ctx, cx, floorY + 2, { scale: sc * 1.04, turn: t > 25.8 ? 0.95 : 0.55, headDrop: t > 26 && t < 28.6 ? -1 : 0, step: k > 0 && k < 1 ? Math.sin(t * 7) : 0, armSpread: 0.04 });
      }
    } else {
      // CALEB's own take: the same set, the same stool, the same slump the ad asks for; open hands on its last line
      figure(ctx, stoolX, floorY + 2, { scale: sc, seated: true, lean: 6, headDrop: (t > 16.8 ? 9 : 6) + breath * 1.2, turn: 0.7, handsFolded: t < 6.7, armSpread: t >= 10.5 && t < 14.5 ? 0.3 : 0 });
    }
    // after cut: the studio's flat work lights over everything
    if (workOn > 0) { const was = ctx.globalAlpha; ctx.globalAlpha = was * 0.14 * workOn; ui.px(ctx, x, y, w, h, ERA1.white); ctx.globalAlpha = was; }
  }
  // the camcorder: interlace, a little noise
  const was = ctx.globalAlpha;
  ctx.globalAlpha = was * 0.12;
  for (let yy = y; yy < y + h; yy += 3) ui.px(ctx, x, yy, w, 1, F.scan);
  if (!still) {
    ctx.globalAlpha = was * 0.35;
    for (let i = 0; i < 40; i++) {
      const nx = x + ((i * 97 + Math.floor(tick * 24) * 31) % w), ny = y + ((i * 53 + Math.floor(tick * 24) * 17) % h);
      ui.px(ctx, nx, ny, 1, 1, i % 2 ? F.osd : F.black);
    }
  }
  ctx.globalAlpha = was;
  if (!still) {
    ui.setFont(ctx, Math.max(7, Math.round(9 * s)));
    if (Math.floor(tick * 2) % 2 === 0) ui.px(ctx, x + 8, y + 9, Math.round(6 * s) + 1, Math.round(6 * s) + 1, F.rec);
    ctx.fillStyle = F.osd; ctx.fillText('REC', x + 18, y + 7);
    const tw = ctx.measureText(T.tapes.tape).width;
    ctx.fillText(T.tapes.tape, x + w - 10 - tw, y + 7);
    const base = clip === 'daniel' ? 252 : clip === 'caleb' ? 301 : 340;
    const sec = base + Math.floor(t), fr = Math.floor((t % 1) * 25);
    const tc = `00:${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}:${String(fr).padStart(2, '0')}`;
    ctx.fillText(tc, x + w - 10 - ctx.measureText(tc).width, y + h - 16);
    ctx.fillText('SP', x + 10, y + h - 16);
  }
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
