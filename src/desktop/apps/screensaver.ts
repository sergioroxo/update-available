/**
 * ⚑ S208 — THE SCREENSAVERS (data/strings/screensavers.json `_doc`; his, 2026-10-01: "inspired by the 95 ones…
 * relevant to the topic and the style of the experience… be creative about it").
 *
 * Each era's machine sleeps the way machines of its day did, and each sleep belongs to whoever owns the machine:
 *   stars — 1997, before the kit: the PC's own starfield (his machine, still his).
 *   text  — 1997, after the kit: the kit has replaced it with its own sign-off, WALK ON, in tumbling chrome 3D text.
 *   lambs — 2003: Restorify's flock flying out of the dark, haloed, all one way — and one lamb, halo-less, flying
 *           the other way, smaller and smaller, never caught.
 *   lock  — 2016: GracePlatform's lock screen: a sunrise, the time, a line of inspiration, "Like what you see?",
 *           and the corrections still counting up while she is away.
 *   orb   — 2026: GraceOS's breathing orb, wellness words circling it.
 *
 * Diegetic: the machine, not the piece. Nothing is filed. A press wakes it and does nothing else; the hosts (os.ts,
 * graceQueueLite.ts, browser.ts) decide WHEN — only after SAVER_SECONDS of no press, nothing open, nothing playing.
 * Pixel discipline: whole-pixel rects in each era's palette, banded (never smooth) light; it steps at ~11 Hz so the
 * monitor's texture uploads only when something moved.
 */
import { meetWord } from '../../room/lexicon';
import { ERA1 } from '../theme/era1';
import { ERA3 } from '../theme/era3';
import { ERA4 } from '../theme/era4';
import * as ui from '../theme/chrome';
import { PLACE, WALL } from '../theme/era4';
import { SAVER_ROOM } from '../theme/screensaver';
import { text as dotText, textW } from '../../room/font57';
import LEXICON from '../../../data/strings/lexicon.json';
import { faceEra, type FaceEra } from '../theme/fonts';
import S from '../../../data/strings/screensavers.json';

export type SaverKind = 'stars' | 'text' | 'lambs' | 'lock' | 'orb' | 'pipes' | 'flock' | 'lexicon' | 'marquee' | 'maze';
/** how long a desktop must be quiet — no press, nothing open, nothing playing — before its machine sleeps */
export const SAVER_SECONDS = 150;
const STEP_S = 0.09;
// In-memory visits keep short exhibition slots from always restarting at the same word.
const WORDS = LEXICON.terms.map(t => t.word).filter((w): w is string => typeof w === 'string');
const DAY_LINES = LEXICON.terms.map(t => t.line).filter((l): l is string => typeof l === 'string');
const MARQUEE_LINES = S.marquee.infomercial.flatMap((line, i) => [line, DAY_LINES[i]])
  .concat(DAY_LINES.slice(S.marquee.infomercial.length));
let wordVisit = 0, marqueeVisit = 0;

export class Screensaver {
  private reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  private rotation: SaverKind[] = [];
  private rotationT = 0;
  private rotationIdx = 0;
  private active: Screensaver | null = null;
  private passage = 0;
  private wordStart = 0;
  private marqueeStart = 0;
  private wordIdx = -1;
  private targets: Array<[number, number]> = [];
  private pipes: Array<{ x: number; y: number; z: number; ink: number }> = [];
  private mazeCanvas: HTMLCanvasElement | null = null;
  private acc = 0;

  /** The host still owns quiet/wake conditions; rotation never creates an input or a ledger event. */
  rotate(era: 'e1' | 'e2' | 'e3' | 'e4'): this {
    const list = (era === 'e1' && this.kind === 'stars' ? S.rotation.e1BeforeKit : S.rotation[era]) as SaverKind[];
    const i = list.indexOf(this.kind);
    this.rotation = [...list.slice(i), ...list.slice(0, i)];
    return this;
  }
  private t = 0;
  private seed: number;
  private pts: Array<{ x: number; y: number; z: number; against?: boolean }> = [];
  private voxels: Array<[number, number]> = [];
  private vw = 0; private vh = 0;
  /** 2016: the clock the room already shows, and the open jobs the counter starts from */
  clock = '';
  waitingFrom = 3;
  /** 2026: the line under the orb (the arrival's "press to restore", or the idle's "press to continue") */
  line = '';

  constructor(readonly kind: SaverKind, seed = 1997) {
    this.seed = seed;
    if (kind === 'lexicon') this.wordStart = wordVisit++ % WORDS.length;
    if (kind === 'marquee') this.marqueeStart = marqueeVisit++ % MARQUEE_LINES.length;
    if (kind === 'stars' || kind === 'lexicon') for (let i = 0; i < 110; i++) this.pts.push(this.spawn(true));
    if (kind === 'lambs') {
      for (let i = 0; i < 26; i++) this.pts.push(this.spawn(true));
      this.pts.push({ x: 0.15, y: -0.1, z: 1.2, against: true });
    }
    if (kind === 'text') this.buildVoxels();
    if (kind === 'pipes') this.buildPipes();
    if (this.reduced) this.t = 8;
  }

  private rnd(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  private spawn(anyDepth: boolean): { x: number; y: number; z: number } {
    return { x: (this.rnd() - 0.5) * 2.4, y: (this.rnd() - 0.5) * 1.8, z: anyDepth ? 0.3 + this.rnd() * 3.7 : 4 };
  }

  /** true when the picture changed (the host marks its canvas dirty) */
  update(dt: number): boolean {
    if (this.reduced) return false;
    if (this.rotation.length) {
      this.rotationT += dt;
      if (this.rotationT >= 24) {
        this.rotationT %= 24;
        this.rotationIdx = (this.rotationIdx + 1) % this.rotation.length;
        this.active = new Screensaver(this.rotation[this.rotationIdx], this.seed + ++this.passage);
        this.active.clock = this.clock; this.active.waitingFrom = this.waitingFrom; this.active.line = this.line;
      }
      if (this.active) { this.active.clock = this.clock; return this.active.update(dt); }
    }
    this.acc += dt;
    if (this.acc < STEP_S) return false;
    const step = this.acc; this.acc = 0; this.t += step;
    if (this.kind === 'stars' || this.kind === 'lambs' || this.kind === 'lexicon') {
      const speed = this.kind === 'lambs' ? 0.55 : this.kind === 'lexicon' ? 0.25 : 1.3;
      for (let i = 0; i < this.pts.length; i++) {
        const p = this.pts[i];
        if (p.against) { p.z += step * 0.12; if (p.z > 4.5) { p.z = 0.9; p.x = (this.rnd() - 0.5) * 0.6; p.y = (this.rnd() - 0.5) * 0.4; } continue; }
        p.z -= step * speed;
        if (p.z < 0.25) this.pts[i] = this.spawn(false);
      }
    }
    return true;
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.imageSmoothingEnabled = false;
    if (this.active) { this.active.draw(ctx, W, H); return; }
    switch (this.kind) {
      case 'pipes': this.drawPipes(ctx, W, H); return;
      case 'flock': this.drawFlock(ctx, W, H); return;
      case 'lexicon': this.drawLexicon(ctx, W, H); return;
      case 'marquee': this.drawMarquee(ctx, W, H); return;
      case 'maze': this.drawMaze(ctx, W, H); return;
      case 'stars': this.drawStars(ctx, W, H); return;
      case 'text': this.drawText(ctx, W, H); return;
      case 'lambs': this.drawLambs(ctx, W, H); return;
      case 'lock': this.drawLock(ctx, W, H); return;
      case 'orb': this.drawOrb(ctx, W, H); return;
    }
  }

  // New drawings are original canvas primitives, stepped at STEP_S; no bright flashes or canvas rotations.
  private buildPipes(): void {
    const occupied = new Set<string>();
    for (let ink = 0; ink < 3; ink++) {
      let x = ink * 4 - 4, y = ink * 3 - 3, z = -3;
      for (let run = 0; run < 22; run++) {
        const axis = Math.floor(this.rnd() * 3), dir = this.rnd() < 0.5 ? -1 : 1;
        const length = 2 + Math.floor(this.rnd() * 5);
        for (let j = 0; j < length; j++) {
          const nx = x + (axis === 0 ? dir : 0), ny = y + (axis === 1 ? dir : 0), nz = z + (axis === 2 ? dir : 0);
          const key = `${nx},${ny},${nz}`;
          if (Math.max(Math.abs(nx), Math.abs(ny), Math.abs(nz)) > 8 || occupied.has(key)) break;
          x = nx; y = ny; z = nz; occupied.add(key); this.pipes.push({ x, y, z, ink });
        }
      }
    }
  }

  private drawPipes(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ui.px(ctx, 0, 0, W, H, ERA1.navy);
    const u = Math.max(3, Math.floor(Math.min(W / 44, H / 38)));
    const inks = [[PLACE.floor, PLACE.sun, ERA1.olive], [PLACE.floorLo, WALL.accent, PLACE.floorHi], [ERA1.tealDark, ERA1.teal, ERA1.titleBlue]];
    // Fill, then clear one cell at a time; no whole-screen reset and no terminal still state.
    const phase = (25 + Math.floor(this.t * 3)) % (this.pipes.length * 2);
    const start = Math.max(0, phase - this.pipes.length);
    const count = Math.min(this.pipes.length, phase);
    const poly = (points: number[][], col: string): void => {
      ctx.fillStyle = col; ctx.beginPath();
      points.forEach(([x, y], i) => i ? ctx.lineTo(Math.round(x), Math.round(y)) : ctx.moveTo(Math.round(x), Math.round(y)));
      ctx.closePath(); ctx.fill();
    };
    // Fixed isometric camera; painter order keeps square-section elbows legible.
    const visible = this.pipes.slice(start, count).sort((a, b) => a.x + a.y - a.z - (b.x + b.y - b.z));
    for (const p of visible) {
      const x = Math.round(W / 2 + (p.x - p.y) * u), y = Math.round(H / 2 + (p.x + p.y) * u / 2 - p.z * u);
      const [dark, front, top] = inks[p.ink];
      poly([[x, y-u], [x+u,y-u/2], [x,y], [x-u,y-u/2]], top);
      poly([[x-u,y-u/2],[x,y],[x,y+u],[x-u,y+u/2]], dark);
      poly([[x,y],[x+u,y-u/2],[x+u,y+u/2],[x,y+u]], front);
    }
  }

  private drawFlock(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ui.px(ctx, 0, 0, W, H, ERA1.navy);
    for (let i = 0; i < 18; i++) {
      const u = Math.max(1, Math.floor(H / 150));
      const span = W + 70 * u, travel = (this.t * 18 + i * span / 18) % span;
      const x = Math.round(travel - 35 * u);
      const y = Math.round(((i % 5 + 1) * H / 7 + travel * 0.22 + (i === 8 ? 27 * u : 0)) % (H + 50 * u) - 25 * u);
      const lift = Math.floor(this.t * 1.5 + i / 3) % 2;
      ctx.fillStyle = ERA1.silver;
      // Little stepped wings; the eighth lamb is consistently below its row.
      for (const side of [-1, 1]) for (let j = 0; j < 4; j++) {
        ctx.fillRect(x + side * (3 + j) * u - (side < 0 ? 2 * u : 0), y - (2 + j * lift) * u, 2 * u, 2 * u);
      }
      this.lamb(ctx, x, y, u, false, 1);
    }
  }

  private drawLexicon(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const index = (this.wordStart + Math.floor(this.t / 18)) % WORDS.length, word = WORDS[index];
    if (index !== this.wordIdx) {
      this.wordIdx = index; this.targets = [];
      const c = document.createElement('canvas'); c.width = textW(word); c.height = 7;
      const g = c.getContext('2d');
      if (g) {
        dotText(g, word, 0, 0, ERA1.white);
        const pixels = g.getImageData(0, 0, c.width, c.height).data;
        for (let y = 0; y < 7; y++) for (let x = 0; x < c.width; x++) if (pixels[(y*c.width+x)*4+3]) this.targets.push([x, y]);
      }
      while (this.pts.length < this.targets.length + 80) this.pts.push(this.spawn(true));
    }
    const e = faceEra();
    const sky = e === 'e4' ? ERA4.field : e === 'e3' ? ERA3.deskTop : ERA1.navy;
    const ink = e === 'e4' ? ERA4.l : e === 'e3' ? ERA3.glow : ERA1.white;
    ui.px(ctx, 0, 0, W, H, sky);
    const ph = this.t % 18;
    const k = ph < 4 ? 0 : ph < 6 ? (ph-4)/2 : ph < 11 ? 1 : ph < 14 ? 1-(ph-11)/3 : 0;
    const ease = k*k*(3-2*k), cell = Math.max(1, Math.floor(W*0.84 / textW(word)));
    const ox = Math.round((W-textW(word)*cell)/2), oy = Math.round((H-7*cell)/2);
    this.pts.forEach((p,i) => {
      const target = this.targets[i];
      if (!target && ease > 0.5) return;
      const sx = W/2 + p.x*W*0.25/p.z, sy = H/2 + p.y*H*0.25/p.z;
      const x = Math.round(target ? sx + (ox+target[0]*cell-sx)*ease : sx);
      const y = Math.round(target ? sy + (oy+target[1]*cell-sy)*ease : sy);
      const size = target && ease > 0.5 ? Math.max(1, cell-1) : 1;
      ui.px(ctx, x,y,size,size, target ? ink : ERA1.grey);
    });
  }

  private drawMarquee(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const era: FaceEra = faceEra(), modern = era === 'e4';
    ui.px(ctx, 0, 0, W, H, modern ? ERA4.field : era === 'e3' ? ERA3.deskTop : ERA1.navy);
    const lines = [...MARQUEE_LINES.slice(this.marqueeStart), ...MARQUEE_LINES.slice(0, this.marqueeStart)];
    ui.setFont(ctx, 26);
    let clock = this.t;
    let line = lines[0], x = Math.round(W*0.12);
    if (!this.reduced) {
      const durations = lines.map(l => (W + ctx.measureText(l).width + 40) / 36);
      clock %= durations.reduce((a,b) => a+b,0);
      for (let i=0; i<lines.length; i++) {
        if (clock < durations[i]) { line = lines[i]; x = Math.round(W-36*clock); break; }
        clock -= durations[i];
      }
    } else {
      // Keep the entire line legible in a still frame, including a long Word of the Day on a phone.
      ui.setFont(ctx, 16);
      const rows = ui.wrapText(ctx, line, W * 0.8);
      ctx.fillStyle = modern ? ERA4.l : era === 'e3' ? ERA3.white : ERA1.white;
      rows.forEach((row, i) => ctx.fillText(row, Math.round((W - ctx.measureText(row).width) / 2),
        Math.round((H - rows.length * 20) / 2 + i * 20)));
      return;
    }
    ctx.fillStyle = modern ? ERA4.l : era === 'e3' ? ERA3.white : ERA1.white;
    ctx.fillText(line, x, Math.round(H*0.48));
  }

  private drawMaze(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    // The path is authored in cells, with branches to look like a maze; the saver never moves the room camera.
    const route = [[1.5,1.5],[7.5,1.5],[7.5,5.5],[5.5,5.5],[5.5,3.5],[3.5,3.5],[3.5,7.5],[1.5,7.5]];
    const grid = Array.from({length:9}, () => Array(9).fill(1));
    for (let i=0; i<route.length; i++) {
      const a=route[i], b=route[(i+1)%route.length];
      for(let j=0; j<=Math.abs(b[0]-a[0])+Math.abs(b[1]-a[1]); j++) {
        grid[Math.floor(a[1]+Math.sign(b[1]-a[1])*j)][Math.floor(a[0]+Math.sign(b[0]-a[0])*j)] = 0;
      }
    }
    grid[2][5]=0; grid[6][6]=0; grid[6][7]=0;
    let time = this.t;
    const durations = route.map((a,i) => {const b=route[(i+1)%route.length]; return (Math.abs(b[0]-a[0])+Math.abs(b[1]-a[1]))*3+3;});
    time %= durations.reduce((a,b)=>a+b,0);
    let leg=0; while (time>=durations[leg]) time-=durations[leg++];
    const a=route[leg], b=route[(leg+1)%route.length], c=route[(leg+2)%route.length];
    const move=durations[leg]-3, fraction=Math.min(1,time/move);
    const px=a[0]+(b[0]-a[0])*fraction, py=a[1]+(b[1]-a[1])*fraction;
    let angle=Math.atan2(b[1]-a[1],b[0]-a[0]);
    let turn=Math.atan2(c[1]-b[1],c[0]-b[0])-angle;
    while(turn>Math.PI) turn-=Math.PI*2; while(turn< -Math.PI) turn+=Math.PI*2;
    if(time>move) {const k=(time-move)/3; angle+=turn*k*k*(3-2*k);}
    const w=Math.max(40,Math.round(120*W/H)), h=120;
    this.mazeCanvas ??= document.createElement('canvas');
    if(this.mazeCanvas.width!==w || this.mazeCanvas.height!==h) {this.mazeCanvas.width=w;this.mazeCanvas.height=h;}
    const g=this.mazeCanvas.getContext('2d'); if(!g) return;
    const modern=faceEra()==='e4', cool=faceEra()==='e3';
    const wall=modern ? PLACE.wall : cool ? ERA3.glassEdge : SAVER_ROOM.wall;
    const band=modern ? PLACE.wallLo : cool ? ERA3.frame : SAVER_ROOM.wallSide;
    ui.px(g,0,0,w,h,SAVER_ROOM.night);
    // Perspective carpet weave, using Daniel's rug brown, never a borrowed texture.
    for(let y=h/2+1;y<h;y++) {
      const distance=h/(2*(y-h/2));
      for(let x=0;x<w;x++) {
        const ray=angle+Math.atan((x/w-0.5)*1.2);
        const fx=Math.floor((px+Math.cos(ray)*distance)*24), fy=Math.floor((py+Math.sin(ray)*distance)*24);
        ui.px(g,x,y,1,1,(fx+fy)%5===0 ? SAVER_ROOM.carpetLow : SAVER_ROOM.carpet);
      }
    }
    const depths:number[]=[];
    for(let x=0;x<w;x++) {
      const ray=angle+Math.atan((x/w-0.5)*1.2), dx=Math.cos(ray), dy=Math.sin(ray);
      let d=0, mx=0,my=0;
      do {d+=0.025;mx=Math.floor(px+dx*d);my=Math.floor(py+dy*d);} while(d<16 && grid[my]?.[mx]===0);
      const distance=Math.max(0.12,d*Math.cos(ray-angle)); depths[x]=distance;
      const height=h/distance, top=Math.floor(h/2-height/2);
      const hx=px+dx*d, hy=py+dy*d;
      const side=Math.abs(hx-Math.round(hx))<0.04;
      const u=((side?hy:hx)%1+1)%1;
      const door=(mx+my)%4===0;
      for(let y=Math.max(0,top);y<Math.min(h,top+height);y++) {
        const v=(y-top)/height;
        let col=side?band:wall;
        if(door && u>0.15 && u<0.85 && v>0.08 && v<0.97) {
          col=SAVER_ROOM.door;
          if(u<0.19 || u>0.81 || v<0.12 || (v>0.48&&v<0.52)) col=PLACE.floorLo;
          if(u>0.70&&u<0.77&&v>0.54&&v<0.60) col=SAVER_ROOM.knob;
        } else if(v>0.90 || Math.floor(u*16)%8===0 || (Math.floor(v*24)%8===0&&Math.floor(u*16)%4===0)) col=band;
        ui.px(g,x,y,1,1,col);
      }
    }
    // A small mascot waits at alternate bends, occluded correctly by the wall columns.
    if(leg%2===0) {
      const dx=b[0]-px, dy=b[1]-py, forward=dx*Math.cos(angle)+dy*Math.sin(angle), lateral=-dx*Math.sin(angle)+dy*Math.cos(angle);
      if(forward>0.6) {
        const size=Math.max(1,Math.round(2/forward)), sx=Math.round(w/2+lateral/forward*w/1.2), sy=Math.round(h/2+h*0.45/forward-4*size);
        if(sx>=0&&sx<w&&forward<depths[sx]) this.lamb(g,sx,sy,size,false,1);
      }
    }
    ctx.drawImage(this.mazeCanvas,0,0,W,H);
  }

  // ── 1997 · the PC's own starfield ─────────────────────────────────────
  private drawStars(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ui.px(ctx, 0, 0, W, H, ERA1.black);
    const f = W * 0.42;
    for (const p of this.pts) {
      const x = Math.round(W / 2 + (p.x * f) / p.z), y = Math.round(H / 2 + (p.y * f) / p.z);
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const near = p.z < 1 ? 2 : 1;
      ctx.fillStyle = p.z < 1.2 ? ERA1.white : p.z < 2.4 ? ERA1.silver : ERA1.grey;
      ctx.fillRect(x, y, near, near);
    }
  }

  // ── 1997 · after the kit: WALK ON, in chrome ──────────────────────────
  /** the words as a grid of solid cells, read once off an offscreen canvas */
  private buildVoxels(): void {
    const c = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (!c) return;
    c.width = 220; c.height = 40;
    const g = c.getContext('2d');
    if (!g) return;
    ui.setFont(g, 30);
    g.fillStyle = ERA1.white;
    const text = S.e1.text;
    const tw = Math.ceil(g.measureText(text).width);
    g.fillText(text, Math.round((c.width - tw) / 2), 4);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const CELL = 2;
    const raw: Array<[number, number]> = [];
    for (let y = 0; y < c.height; y += CELL) for (let x = 0; x < c.width; x += CELL) {
      if (d[(y * c.width + x) * 4 + 3] > 100) raw.push([x / CELL, y / CELL]);
    }
    if (!raw.length) return;
    const minX = Math.min(...raw.map((v) => v[0])), maxX = Math.max(...raw.map((v) => v[0]));
    const minY = Math.min(...raw.map((v) => v[1])), maxY = Math.max(...raw.map((v) => v[1]));
    this.vw = maxX - minX + 1; this.vh = maxY - minY + 1;
    this.voxels = raw.map(([x, y]) => [x - minX, y - minY]);
  }

  private drawText(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ui.px(ctx, 0, 0, W, H, ERA1.black);
    if (!this.voxels.length) return;
    const ry = this.t * 0.9, rx = Math.sin(this.t * 0.37) * 0.35;
    const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
    const scale = (W * 0.8) / this.vw;
    const DEPTH = 5;
    // the chrome: hard reflection bands down the letters, as the period's chrome text had them
    const chrome = [ERA1.white, ERA1.silver, ERA1.titleBlue, ERA1.navy, ERA1.silver, ERA1.white];
    const front = cy >= 0;
    for (let layer = DEPTH; layer >= 0; layer--) {
      const z = ((front ? layer : DEPTH - layer) - DEPTH / 2) * 1.6;
      for (const [vx, vy] of this.voxels) {
        const x0 = vx - this.vw / 2, y0 = vy - this.vh / 2;
        const x1 = x0 * cy + z * sy, z1 = -x0 * sy + z * cy;
        const y1 = y0 * cx - z1 * sx, z2 = y0 * sx + z1 * cx;
        const persp = 60 / (60 + z2);
        const px = Math.round(W / 2 + x1 * scale * persp), py = Math.round(H / 2 + y1 * scale * persp);
        const sz = Math.max(1, Math.ceil(scale * persp));
        if (layer === 0) ctx.fillStyle = chrome[Math.min(chrome.length - 1, Math.floor((vy / this.vh) * chrome.length))];
        else ctx.fillStyle = layer > DEPTH / 2 ? ERA1.greyDark : ERA1.grey;
        ctx.fillRect(px, py, sz, sz);
      }
    }
  }

  // ── 2003 · Restorify's flock ──────────────────────────────────────────
  private drawLambs(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ui.px(ctx, 0, 0, W, H, ERA1.black);
    const f = W * 0.42;
    const order = [...this.pts].sort((a, b) => b.z - a.z);   // far first
    for (const p of order) {
      const x = Math.round(W / 2 + (p.x * f) / p.z), y = Math.round(H / 2 + (p.y * f) / p.z);
      const s = Math.max(1, Math.round(6 / p.z));
      if (x < -40 || y < -40 || x > W + 40 || y > H + 40) continue;
      this.lamb(ctx, x, y, s, !p.against, p.z);
    }
  }

  /** a pixel lamb at unit size s: a cloud of wool, a dark face, four legs, and (for the flock) a halo */
  private lamb(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, halo: boolean, z: number): void {
    const wool = z > 2.6 ? ERA1.grey : z > 1.4 ? ERA1.silver : ERA1.white;
    ctx.fillStyle = wool;
    ctx.fillRect(x - 3 * s, y - s, 6 * s, 3 * s);
    ctx.fillRect(x - 2 * s, y - 2 * s, 4 * s, 5 * s);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillRect(x + 2 * s, y - 2 * s, 2 * s, 2 * s);   // the face, looking ahead
    for (const lx of [-2, -1, 1, 2]) ctx.fillRect(x + lx * s, y + 2 * s, Math.max(1, Math.round(s / 2)), 2 * s);
    if (halo) {
      ctx.fillStyle = ERA1.tooltip;
      ctx.fillRect(x + s, y - 4 * s, 4 * s, Math.max(1, Math.round(s / 2)));
    }
  }

  // ── 2016 · GracePlatform's lock screen ────────────────────────────────
  private drawLock(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    // a dawn in bands, the sun rising slowly, two ridges and a lake
    const bands = [ERA3.deskTop, ERA3.deskMid, ERA3.deskLow, ERA3.accentHi, ERA3.glow];
    const skyH = Math.round(H * 0.6);
    bands.forEach((c, i) => ui.px(ctx, 0, Math.round((i * skyH) / bands.length), W, Math.ceil(skyH / bands.length) + 1, c));
    const sunY = Math.round(skyH * 0.7 - Math.min(40, this.t * 0.5));
    const sunR = Math.round(H * 0.07);
    ctx.fillStyle = ERA3.amber;
    for (let dy = -sunR; dy <= sunR; dy++) { const w = Math.round(Math.sqrt(sunR * sunR - dy * dy)); ctx.fillRect(Math.round(W * 0.68) - w, sunY + dy, w * 2, 1); }
    const ridge = (base: number, amp: number, freq: number, col: string): void => {
      ctx.fillStyle = col;
      for (let x = 0; x < W; x += 2) { const h = Math.round(base - amp * (0.5 + 0.5 * Math.sin(x * freq + amp))); ctx.fillRect(x, h, 2, skyH + 2 - h); }
    };
    ridge(skyH, H * 0.12, 0.011, ERA3.greyDk);
    ridge(skyH, H * 0.06, 0.023, ERA3.ink);
    ui.px(ctx, 0, skyH, W, H - skyH, ERA3.deskTop);
    for (let i = 0; i < 6; i++) ui.px(ctx, Math.round(W * 0.68) - 30 + ((i * 17) % 23), skyH + 6 + i * 9, 60 - i * 8, 2, ERA3.amber);
    // the time, the brand
    ui.setFont(ctx, 44); this.shadowed(ctx, this.clock, 28, 26, ERA3.white);
    ui.setFont(ctx, 12); this.shadowed(ctx, S.e3.brand, 30, 78, ERA3.glassEdge);
    // the line of inspiration, bottom left
    ui.setFont(ctx, 16); this.shadowed(ctx, S.e3.quote, 28, H - 74, ERA3.white);
    ui.setFont(ctx, 10); this.shadowed(ctx, S.e3.quoteBy, 30, H - 52, ERA3.glassEdge);
    // "Like what you see?" — the platform asks for a preference even now
    ui.setFont(ctx, 11);
    const lw = Math.ceil(ctx.measureText(S.e3.like).width);
    const lx = W - lw - 92, ly = 30;
    this.shadowed(ctx, S.e3.like, lx, ly, ERA3.white);
    for (const [i, up] of [[0, true], [1, false]] as Array<[number, boolean]>) {
      const bx = W - 80 + i * 34, by = ly - 4;
      ui.px(ctx, bx, by, 26, 20, ERA3.taskMid);
      ui.px(ctx, bx, by, 26, 1, ERA3.glassEdge);
      ctx.fillStyle = ERA3.white;   // a chevron, up or down
      for (let k = 0; k < 4; k++) ctx.fillRect(bx + 13 - (3 - k) - 1, by + (up ? 6 + k : 13 - k), (3 - k) * 2 + 2, 1);
    }
    // the work does not stop when she does
    const n = this.waitingFrom + Math.floor(this.t / 18);
    const msg = S.e3.waiting.replace('{n}', String(n));
    ui.setFont(ctx, 11);
    const mw = Math.ceil(ctx.measureText(msg).width) + 34;
    ui.px(ctx, W - mw - 24, H - 62, mw, 26, ERA3.taskBot);
    ui.px(ctx, W - mw - 24, H - 62, 3, 26, ERA3.amber);
    ui.px(ctx, W - mw - 12, H - 53, 8, 8, ERA3.amber);
    ctx.fillStyle = ERA3.white; ctx.fillText(msg, W - mw + 2, H - 55);
  }

  private shadowed(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, col: string): void {
    ctx.fillStyle = ERA3.ink; ctx.fillText(text, x + 1, y + 1);
    ctx.fillStyle = col; ctx.fillText(text, x, y);
  }

  // ── 2026 · GraceOS's breathing orb ────────────────────────────────────
  private drawOrb(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ui.px(ctx, 0, 0, W, H, ERA4.field);
    const period = 8;
    const ph = (this.t % period) / period;   // 0..1: in for the first half, out for the second
    const breath = ph < 0.5 ? ph * 2 : 2 - ph * 2;
    const cx = Math.round(W / 2), cy = Math.round(H * 0.46);
    const R = Math.round(Math.min(W, H) * (0.16 + 0.08 * breath));
    const rings = [ERA4.panelHi, ERA4.rule, ERA4.lBand, ERA4.lDim, ERA4.l, ERA4.glow];
    rings.forEach((col, i) => {   // banded, outermost first
      const r = Math.round(R * (1.5 - i * 0.2));
      if (r <= 0) return;
      ctx.fillStyle = col;
      for (let dy = -r; dy <= r; dy += 2) { const w = Math.round(Math.sqrt(r * r - dy * dy)); ctx.fillRect(cx - w, cy + dy, w * 2, 2); }
    });
    // the words that circle it: one at a time, a slow orbit
    const aff = S.e4.affirmations;
    const ai = Math.floor(this.t / 6) % aff.length;
    const ang = this.t * 0.25;
    ui.setFont(ctx, 11);
    const word = aff[ai];
    const ww = ctx.measureText(word).width;
    const ox = Math.round(cx + Math.cos(ang) * R * 1.9 - ww / 2), oy = Math.round(cy + Math.sin(ang) * R * 1.25);
    ctx.fillStyle = ERA4.meta; ctx.fillText(word, ox, oy);
    // in / out
    ui.setFont(ctx, 14);
    const cue = ph < 0.5 ? S.e4.in : S.e4.out;
    const cw = ctx.measureText(cue).width;
    ctx.fillStyle = ERA4.textHi; ctx.fillText(cue, Math.round(cx - cw / 2), cy + Math.round(R * 1.6) + 6);
    ui.setFont(ctx, 12);
    const mw = ctx.measureText(S.e4.mark).width;
    ctx.fillStyle = ERA4.dim; ctx.fillText(S.e4.mark, Math.round(cx - mw / 2), 22);
    // ⚑ S209 / B8 — the tell: the companion is awake behind the calm, and it has a phrase for her
    ui.setFont(ctx, 10);
    const ww2 = ctx.measureText(S.e4.waiting).width;
    ctx.fillStyle = ERA4.meta; ctx.fillText(S.e4.waiting, Math.round(cx - ww2 / 2), 40);
    if (Math.floor(this.t / 12) % 2 === 1) {   // every other twelve seconds, the phrase of the day
      meetWord('bornthatway');   // S209 / P7-47
      const ph = `${S.e4.phraseLabel}: \u201c${S.e4.phrase}\u201d`;
      ui.setFont(ctx, 10);
      const pw = ctx.measureText(ph).width;
      ctx.fillStyle = ERA4.l; ctx.fillText(ph, Math.round(cx - pw / 2), H - 58);
    }
    if (this.line) {
      ui.setFont(ctx, 12);   // S208 / A20 (ERA26-11) — the one instruction, legible: 12 px in the era's text colour
      const lw = ctx.measureText(this.line).width;
      ctx.fillStyle = ERA4.text; ctx.fillText(this.line, Math.round((W - lw) / 2), H - 34);
    }
  }
}
