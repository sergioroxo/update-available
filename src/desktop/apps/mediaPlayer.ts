/**
 * THE MEDIA PLAYER — a 2003 desktop player for a file someone sent (S157,
 * OPEN_ITEMS R3-52: "the sounds he made should open a media player, or a file
 * you press to play"). Caleb's rip arrives as an ATTACHMENT in the messenger;
 * pressing it opens this — a small window, the file's name, a bar that fills
 * as it plays, Play / Stop. Nothing here files: listening to what a friend
 * sent is not an act the apparatus records (the same law as the video's
 * play button and the tapes' Tape C).
 *
 * One class for the family: the era's own colours come from `look` (2003 =
 * the ERA1 chrome the desktop already wears). Audio through `playOnce` — the
 * registry law, the mute law, the pause law all come with it.
 */
import { ERA1, ERA1_CANVAS } from '../theme/era1';
import * as ui from '../theme/chrome';
import { playOnce, stopClip, isAudioAvailable } from '../../audio/tapeAudio';
import copy from '../../../data/dialog/s2_caleb.json';

interface Hit { x: number; y: number; w: number; h: number; id: string }
const S = copy.player as { title: string; play: string; stop: string; unavailable: string; sizeLabel: string };
const DW = 280; const DH = 118;

export class MediaPlayerApp {
  open = true;
  dirty = true;
  onClose?: () => void;
  private hits: Hit[] = [];
  private el: HTMLAudioElement | null = null;
  private t = 0;
  constructor(private readonly file: { name: string; audio: string; size: string }) {}

  get playing(): boolean { return !!this.el && !this.el.paused && !this.el.ended; }

  update(dt: number): void {
    this.t += dt;
    if (this.playing) this.dirty = true;
    if (this.el && this.el.ended) { this.el = null; this.dirty = true; }
  }

  private play(): void {
    if (this.playing) return;
    this.el = playOnce(this.file.audio);
    if (this.el) this.el.volume = 0.6;
    this.dirty = true;
  }
  private stop(): void {
    stopClip(this.el); this.el = null; this.dirty = true;
  }
  close(): void {
    this.stop();
    this.open = false;
    this.onClose?.();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.hits = [];
    const dx = Math.round((ERA1_CANVAS.width - DW) / 2); const dy = Math.round((ERA1_CANVAS.height - DH) / 2) + 30;
    const c = ui.windowFrame(ctx, dx, dy, DW, DH, S.title, true, 'media');
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.beige);
    this.hits.push({ ...c.closeBox, id: 'mp-close' });
    // the file
    ui.px(ctx, c.x + 10, c.y + 10, 14, 18, ERA1.white);
    ui.px(ctx, c.x + 10, c.y + 10, 14, 1, ERA1.grey); ui.px(ctx, c.x + 10, c.y + 10, 1, 18, ERA1.grey);
    ui.px(ctx, c.x + 14, c.y + 16, 6, 6, ERA1.navy);
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(this.file.name, c.x + 32, c.y + 10);
    ui.setFont(ctx, 8);
    ctx.fillStyle = ERA1.grey;
    ctx.fillText(S.sizeLabel.replace('{size}', this.file.size), c.x + 32, c.y + 22);
    // the bar — a black well, a navy fill
    const bx = c.x + 10; const by = c.y + 40; const bw = c.w - 20;
    ui.px(ctx, bx - 1, by - 1, bw + 2, 10, ERA1.greyDark);
    ui.px(ctx, bx, by, bw, 8, ERA1.black);
    const k = this.el && this.el.duration ? Math.min(1, this.el.currentTime / this.el.duration) : 0;
    ui.px(ctx, bx, by, Math.round(bw * k), 8, ERA1.navy);
    ui.setFont(ctx, 8);
    ctx.fillStyle = ERA1.greyDark;
    const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    ctx.fillText(this.el ? `${mmss(this.el.currentTime)} / ${mmss(this.el.duration || 0)}` : '0:00', bx, by + 12);
    // the transport
    const available = isAudioAvailable(this.file.audio);
    const by2 = c.y + c.h - 26;
    if (!available) {
      ctx.fillStyle = ERA1.warnDark;
      ctx.fillText(S.unavailable, bx, by2 + 4);
    } else if (this.playing) {
      ui.button(ctx, bx, by2, 64, 18, S.stop, {});
      this.hits.push({ x: bx, y: by2, w: 64, h: 18, id: 'mp-stop' });
    } else {
      ui.button(ctx, bx, by2, 64, 18, S.play, {});
      this.hits.push({ x: bx, y: by2, w: 64, h: 18, id: 'mp-play' });
    }
  }

  handleClick(x: number, y: number): void {
    const hit = this.hits.find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit) return;
    if (hit.id === 'mp-close') this.close();
    else if (hit.id === 'mp-play') this.play();
    else if (hit.id === 'mp-stop') this.stop();
  }
}
