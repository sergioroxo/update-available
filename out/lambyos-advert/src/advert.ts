/**
 * LambyOS — Welcome Home: the advert, drawn one frame at a time.
 *
 * A render tool, not part of the piece: it is bundled by render.mjs, opened in headless Chromium, and asked for
 * frame N (`window.renderFrame(n)`) by a driver that writes each frame to ffmpeg. Nothing here runs on a clock —
 * every picture is a pure function of the frame number and timeline.json (made by make_audio.py from the measured
 * narration), so the captions land on the frame the voice does.
 *
 * What it is built from (CLAUDE.md: never invent colours):
 *   · every colour is IMPORTED from the piece's palettes in src/desktop/theme/ — Restorify's sunrise and the lamb
 *     (CAL_2003), the 1997 band poster's night and lights (CAL_1997), Floppysheep's field and its approved
 *     "spectacle" colours (FLOPPY, FLOPPY_BOMB — never arranged as a six-band rainbow), the 1997 machine (ERA1),
 *     the 1997 web (WEB97), Daniel's room (PLACE / WALL);
 *   · the 3D is PlayCanvas, as the piece uses it, with the piece's own low-poly GLBs from public/assets/models/;
 *     the four empty rooms are the piece's own rooms, photographed by plates.mjs;
 *   · Lamby is the piece's one Lamby (src/desktop/apps/lambyChar.ts) — a picture only: he never speaks;
 *   · the end card's dots are the piece's DOT glyphs (src/frame/leavePage.ts), its words data/strings/setup.json,
 *     its small print data/dialog/s2_media.json — exactly what the piece's own end card reads.
 *
 * Register: the programme's pitch only (operable), and it collapses. Figures are hands and empty rooms; no faces,
 * no queer person "fixed", no real marks. The frame's voice appears once, after the tape has died.
 */
import * as pc from 'playcanvas';
import { ERA1 } from '../../../src/desktop/theme/era1';
import { PLACE, WALL } from '../../../src/desktop/theme/era4';
import { CAL_1997, CAL_2003 } from '../../../src/desktop/theme/calendar';
import { WEB97 } from '../../../src/desktop/theme/web1997';
import { FLOPPY, FLOPPY_BOMB } from '../../../src/desktop/theme/era3';
import { drawLambyChar } from '../../../src/desktop/apps/lambyChar';
import { DOT } from '../../../src/frame/leavePage';
import setupCopy from '../../../data/strings/setup.json';
import media from '../../../data/dialog/s2_media.json';
import room from '../../../data/room/era1.json';

// ── the timeline (injected by the driver) ─────────────────────────────────────────────────────────────────────
interface Line { id: string; shot: string; start: number; end: number; text: string; fast: boolean; stretch: boolean }
interface Sound { shot: string; start: number; end: number; text: string }
interface Shot { id: string; start: number; end: number; chime?: number }
interface Montage { item: string; label: string; sub: string; start: number; end: number }
interface Timeline {
  fps: number; duration: number; shots: Shot[]; lines: Line[]; sounds: Sound[];
  items: Record<string, number>; boxes: number[]; slogan: { start: number; end: number }; montage: Montage[];
  type: {
    ident: string; kitchen: string; flow: string[]; rooms: string[]; slogan: string; fineFast: string;
    parade: Record<string, string>; headsetBadge: string; more: string[]; free: string; flowTitle: string;
  };
}
let TL: Timeline;
const SH: Record<string, Shot> = {};

const W = 1920, H = 1080;
const GATHER = setupCopy.advertAsterisk.gather as string[];
const SMALL_PRINT: string = (media as { scenes: { line: string }[] }).scenes.find((s) => /not a cure/.test(s.line))?.line ?? '';
const prop = (id: string): string => (room as { props: { id: string; color: string }[] }).props.find((p) => p.id === id)!.color;

// ── palette: every value imported, none written here ───────────────────────────────────────────────────────────
const C = {
  vcrBlue: WEB97.link, white: ERA1.white, black: ERA1.black, navy: ERA1.navy, silver: ERA1.silver, grey: ERA1.grey,
  greyDark: ERA1.greyDark, paper: ERA1.paper, smallPrint: ERA1.tooltip,
  night: CAL_1997.night, dusk: CAL_1997.dusk, haze: CAL_1997.haze, glow: CAL_1997.glow, pinkTitle: CAL_1997.title,
  spark: CAL_1997.spark, beamA: CAL_1997.beamA, beamB: CAL_1997.beamB, beamC: CAL_1997.beamC, shadow: CAL_1997.titleShadow,
  stageTop: CAL_1997.stageTop,
  skyTop: CAL_2003.skyTop, skyMid: CAL_2003.skyMid, skyLow: CAL_2003.skyLow, horizon: CAL_2003.skyHorizon,
  sun: CAL_2003.sun, sunCore: CAL_2003.sunCore, ray: CAL_2003.ray, brand: CAL_2003.brand, tagline: CAL_2003.tagline,
  wool: CAL_2003.wool, woolShade: CAL_2003.woolShade, lambFace: CAL_2003.lambFace,
  fSky: FLOPPY.sky, fSkyLow: FLOPPY.skyLow, fHillFar: FLOPPY.hillFar, fHill: FLOPPY.hill, fHillDk: FLOPPY.hillDk,
  fFence: FLOPPY.fence, fFenceDk: FLOPPY.fenceDk, fFace: FLOPPY.face, fLeg: FLOPPY.leg, fSun: FLOPPY.sun,
  hot: FLOPPY_BOMB.hot, pink: FLOPPY_BOMB.pink, lime: FLOPPY_BOMB.lime, cyan: FLOPPY_BOMB.cyan, gold: FLOPPY_BOMB.gold,
  orange: FLOPPY_BOMB.orange, violet: FLOPPY_BOMB.violet,
  wall: PLACE.wall, wallHi: PLACE.wallHi, wallLo: PLACE.wallLo, wood: prop('deskTop'), woodDk: prop('deskLegFL'),
  lampWarm: PLACE.sun, ink: PLACE.ink, rugHi: PLACE.rugHi, textile: PLACE.textile, textileHi: PLACE.textileHi,
  bookAlt: PLACE.bookAlt, floorHi: PLACE.floorHi, sill: PLACE.sill, mug: PLACE.mug, accent: WALL.accent,
  card: WALL.card, cardEdge: WALL.cardEdge, windowPane: prop('windowPane'), moon: prop('moon'), moonlight: '',
  floppy: prop('kitFloppy'), floppyShutter: prop('kitFloppyShutter'), floppyLabel: prop('kitFloppyLabel'),
  mixtape: prop('mixtape'), teal: ERA1.teal, tealDark: ERA1.tealDark, titleBlue: ERA1.titleBlue,
  heading: WEB97.heading, construction: WEB97.construction, page: WEB97.page
};
C.moonlight = (room as { lights: { id: string; color: string }[] }).lights.find((l) => l.id === 'moonlight')!.color;

// ── small maths ─────────────────────────────────────────────────────────────────────────────────────────────────
const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v));
const smooth = (k: number): number => { const c = clamp(k); return c * c * (3 - 2 * c); };
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
const backOut = (k: number): number => { const c = clamp(k), s = 1.9; return 1 + (s + 1) * Math.pow(c - 1, 3) + s * Math.pow(c - 1, 2); };
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const rgba = (hex: string, a: number): string => { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; };
const col = (hex: string): pc.Color => { const [r, g, b] = rgb(hex); return new pc.Color(r / 255, g / 255, b / 255); };

function canvas(w = W, h = H, readBack = false): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d', { willReadFrequently: readBack })!];
}

// ── fonts ───────────────────────────────────────────────────────────────────────────────────────────────────────
const F_CHUNK = '"Inter", "Liberation Sans", sans-serif';
const F_SERIF = '"Liberation Serif", "DejaVu Serif", serif';
const F_CAP = '"Liberation Sans", "DejaVu Sans", sans-serif';
const F_OSD = '"Unifont", "DejaVu Sans Mono", monospace';
const F_MONO = '"DejaVu Sans Mono", "Liberation Mono", monospace';

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
//  2D KIT: gradients, sunbursts, star wipes, chunky type, flares, sparkles, badges
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function vGrad(ctx: CanvasRenderingContext2D, stops: [number, string][], x = 0, y = 0, w = W, h = H): void {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
}

function sunburst(ctx: CanvasRenderingContext2D, cx: number, cy: number, rot: number, a: string, b: string, n = 18, glow?: string): void {
  ctx.fillStyle = a; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = b;
  const R = 2600;
  for (let i = 0; i < n; i++) {
    const a0 = rot + (i / n) * Math.PI * 2, a1 = a0 + Math.PI / n;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R); ctx.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R);
    ctx.closePath(); ctx.fill();
  }
  if (glow) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 900);
    g.addColorStop(0, rgba(glow, 0.95)); g.addColorStop(0.35, rgba(glow, 0.35)); g.addColorStop(1, rgba(glow, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}

function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rot: number, points = 5, inner = 0.45): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 ? r * inner : r, a = rot + (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath();
}

/** the 1997 star wipe: B is revealed inside a growing, turning star; a gold rim rides its edge */
function starWipe(ctx: CanvasRenderingContext2D, A: HTMLCanvasElement, B: HTMLCanvasElement, k: number): void {
  ctx.drawImage(A, 0, 0);
  if (k <= 0) return;
  const e = smooth(k), r = e * 2400, rot = e * 1.4;
  ctx.save(); starPath(ctx, W / 2, H / 2, r, rot); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore();
  if (k < 1) {
    ctx.save(); starPath(ctx, W / 2, H / 2, r, rot);
    ctx.lineWidth = 22; ctx.strokeStyle = C.gold; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.lineWidth = 6; ctx.strokeStyle = C.spark; ctx.stroke();
    ctx.restore();
  }
}

/** chunky 1997 extruded type, rendered into its own canvas so it can bounce, spin and shine */
const chunkCache = new Map<string, HTMLCanvasElement>();
interface ChunkOpts { size: number; face: [string, string, string?]; side: string; outline: string; depth?: number; font?: string; italic?: boolean }
function chunky(text: string, o: ChunkOpts): HTMLCanvasElement {
  const key = JSON.stringify([text, o]);
  const hit = chunkCache.get(key); if (hit) return hit;
  const font = `${o.italic ? 'italic ' : ''}900 ${o.size}px ${o.font ?? F_CHUNK}`;
  const [, m] = canvas(8, 8); m.font = font;
  const tw = Math.ceil(m.measureText(text).width), depth = o.depth ?? Math.round(o.size * 0.12);
  const pad = Math.round(o.size * 0.25) + depth;
  const [c, ctx] = canvas(tw + pad * 2, Math.round(o.size * 1.35) + pad * 2);
  ctx.font = font; ctx.textBaseline = 'alphabetic';
  const x = pad, y = pad + o.size * 1.0;
  ctx.lineJoin = 'round';
  // the extrusion: the side colour, stepped down-right, with an outline so it reads as a solid
  for (let i = depth; i > 0; i--) {
    ctx.lineWidth = o.size * 0.09; ctx.strokeStyle = o.outline; ctx.strokeText(text, x + i * 0.7, y + i);
    ctx.fillStyle = o.side; ctx.fillText(text, x + i * 0.7, y + i);
  }
  ctx.lineWidth = o.size * 0.11; ctx.strokeStyle = o.outline; ctx.strokeText(text, x, y);
  // the face: a three-stop gradient, then a gloss band across its top half
  const [lay, lc] = canvas(c.width, c.height);
  lc.font = font; lc.textBaseline = 'alphabetic';
  const g = lc.createLinearGradient(0, y - o.size * 0.8, 0, y + o.size * 0.08);
  g.addColorStop(0, o.face[0]); g.addColorStop(0.55, o.face[1]); g.addColorStop(1, o.face[2] ?? o.face[1]);
  lc.fillStyle = g; lc.fillText(text, x, y);
  lc.globalCompositeOperation = 'source-atop';
  const gl = lc.createLinearGradient(0, y - o.size * 0.8, 0, y - o.size * 0.3);
  gl.addColorStop(0, rgba(C.white, 0.85)); gl.addColorStop(1, rgba(C.white, 0));
  lc.fillStyle = gl; lc.fillRect(0, y - o.size * 0.85, c.width, o.size * 0.5);
  ctx.drawImage(lay, 0, 0);
  ctx.lineWidth = Math.max(2, o.size * 0.025); ctx.strokeStyle = rgba(C.white, 0.6); ctx.strokeText(text, x, y);
  chunkCache.set(key, c);
  return c;
}
function drawChunky(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, cx: number, cy: number, scale = 1, rot = 0, alpha = 1): void {
  if (scale <= 0.001 || alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(scale, scale);
  ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.restore();
}

/** a lens flare: core, halo, anamorphic streak and ghosts toward the frame's centre — additive, never a strobe */
function flare(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, a: number): void {
  if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const R = (r: number, c: string, al: number, px = x, py = y): void => {
    const g = ctx.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, rgba(c, al * a)); g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  };
  R(260 * s, C.sunCore, 0.45); R(90 * s, C.spark, 0.95); R(30 * s, C.white, 1);
  ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.035);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 900 * s); g.addColorStop(0, rgba(C.beamB, 0.9 * a)); g.addColorStop(1, rgba(C.beamB, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 900 * s, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  const dx = W / 2 - x, dy = H / 2 - y;
  ([[0.5, 40, C.beamC, 0.25], [0.8, 70, C.beamB, 0.18], [1.25, 26, C.beamA, 0.3], [1.6, 110, C.beamC, 0.12]] as [number, number, string, number][])
    .forEach(([k, r, c, al]) => R(r * s, c, al, x + dx * k, y + dy * k));
  ctx.restore();
}

/** four-point glints */
function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c = C.spark): void {
  if (r <= 0.5) return;
  ctx.save(); ctx.fillStyle = c; ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill(); ctx.restore();
}
function sparkleField(ctx: CanvasRenderingContext2D, t: number, seed: number, n: number, box: [number, number, number, number], size = 26): void {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = box[0] + r() * box[2], y = box[1] + r() * box[3], ph = r() * 6.28, sp = 2.5 + r() * 3;
    const k = Math.max(0, Math.sin(t * sp + ph));
    sparkle(ctx, x, y, size * k * k, i % 3 ? C.spark : C.white);
  }
}

/** a starburst price-badge — the infomercial's NEW! and FREE! */
function badge(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, text: string, fill = C.gold, ink = C.hot): void {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  starPath(ctx, 0, 0, r, 0, 16, 0.8); ctx.fillStyle = C.shadow; ctx.translate(6, 8); ctx.fill(); ctx.translate(-6, -8);
  starPath(ctx, 0, 0, r, 0, 16, 0.8); ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = C.white; ctx.stroke();
  ctx.rotate(-0.18);
  const lines = text.split('\n');
  const fs = Math.round(r * (lines.length > 1 ? 0.36 : 0.5));
  ctx.font = `900 ${fs}px ${F_CHUNK}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => {
    const yy = (i - (lines.length - 1) / 2) * fs * 1.05;
    ctx.lineWidth = 8; ctx.strokeStyle = C.white; ctx.strokeText(l, 0, yy); ctx.fillStyle = ink; ctx.fillText(l, 0, yy);
  });
  ctx.restore();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/), out: string[] = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out;
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
//  3D: PlayCanvas, as the piece uses it — the kitchen table, the pedestal, the products
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
let app: pc.Application;
let pcCanvas: HTMLCanvasElement;
let camera: pc.Entity;
const groups: Record<string, pc.Entity> = {};
const items: Record<string, pc.Entity> = {};
const lights: Record<string, pc.Entity> = {};
let pedestal: pc.Entity, pedestalSpin: pc.Entity, motherHand: pc.Entity, teenHand: pc.Entity, floppyKit: pc.Entity;

const matCache = new Map<string, pc.StandardMaterial>();
function mat(hex: string, o: { emissive?: boolean; gloss?: number; map?: pc.Texture; glow?: number } = {}): pc.StandardMaterial {
  const key = `${hex}|${o.emissive}|${o.gloss}|${o.map ? o.map.name : ''}|${o.glow}`;
  const hit = matCache.get(key); if (hit) return hit;
  const m = new pc.StandardMaterial();
  m.diffuse = col(hex);
  if (o.map) { m.diffuseMap = o.map; m.diffuse = new pc.Color(1, 1, 1); }
  if (o.emissive) { m.emissive = col(hex); if (o.map) { m.emissiveMap = o.map; m.emissive = new pc.Color(1, 1, 1); } m.emissiveIntensity = o.glow ?? 1; }
  m.useMetalness = false;
  m.gloss = o.gloss ?? 0.35; m.specular = new pc.Color(0.25, 0.25, 0.25);
  m.update(); matCache.set(key, m);
  return m;
}
function prim(type: string, name: string, size: [number, number, number], m: pc.Material, parent: pc.Entity, pos: [number, number, number] = [0, 0, 0], rot: [number, number, number] = [0, 0, 0]): pc.Entity {
  const e = new pc.Entity(name);
  e.addComponent('render', { type, material: m, castShadows: false, receiveShadows: false });
  e.setLocalScale(...size); e.setLocalPosition(...pos); e.setLocalEulerAngles(...rot);
  parent.addChild(e);
  return e;
}
const box = (name: string, size: [number, number, number], hex: string, parent: pc.Entity, pos: [number, number, number], rot: [number, number, number] = [0, 0, 0], o = {}): pc.Entity =>
  prim('box', name, size, mat(hex, o), parent, pos, rot);
function group(name: string, parent: pc.Entity = app.root): pc.Entity { const e = new pc.Entity(name); parent.addChild(e); return e; }

/** a canvas → texture, nearest-filtered (CLAUDE.md pixel discipline) */
function canvasTexture(name: string, c: HTMLCanvasElement): pc.Texture {
  const t = new pc.Texture(app.graphicsDevice, {
    name, width: c.width, height: c.height, format: pc.PIXELFORMAT_RGBA8, mipmaps: false,
    minFilter: pc.FILTER_NEAREST, magFilter: pc.FILTER_NEAREST, addressU: pc.ADDRESS_CLAMP_TO_EDGE, addressV: pc.ADDRESS_CLAMP_TO_EDGE
  });
  t.setSource(c);
  return t;
}

const glbs: Record<string, pc.Asset> = {};
function loadGlb(file: string): Promise<void> {
  return new Promise((res, rej) => app.assets.loadFromUrl(`assets/models/${file}`, 'container', (err, asset) => {
    if (err || !asset) rej(err); else { glbs[file] = asset; res(); }
  }));
}
/** a piece GLB, fitted to `size` (its largest dimension), standing on y=0, centred, tinted toward `tint` */
function model(file: string, size: number, tint?: string, strength = 0.75, parts?: Record<string, string>): pc.Entity {
  const res = glbs[file].resource as { instantiateRenderEntity: () => pc.Entity };
  const inner = res.instantiateRenderEntity();
  const wrap = new pc.Entity(`m-${file}`);
  wrap.addChild(inner);
  const aabb = new pc.BoundingBox(); let first = true;
  inner.forEach((n) => {
    const e = n as pc.Entity;
    if (!e.render) return;
    for (const mi of e.render.meshInstances) {
      if (first) { aabb.copy(mi.aabb); first = false; } else aabb.add(mi.aabb);
      const src = mi.material as pc.StandardMaterial;
      const cl = src.clone() as pc.StandardMaterial;
      const part = parts?.[src.name];
      if (part) cl.diffuse = col(part);
      else if (tint) { const t = col(tint), d = cl.diffuse; cl.diffuse = new pc.Color(lerp(d.r, t.r, strength), lerp(d.g, t.g, strength), lerp(d.b, t.b, strength)); }
      cl.diffuseMap = null; cl.update(); mi.material = cl;
    }
  });
  const he = aabb.halfExtents, s = size / (2 * Math.max(he.x, he.y, he.z));
  inner.setLocalScale(s, s, s);
  inner.setLocalPosition(-aabb.center.x * s, -(aabb.center.y - he.y) * s, -aabb.center.z * s);
  return wrap;
}

function makeHand(name: string, skin: string, sleeve: string, cuff: string): pc.Entity {
  // a hand pointing +x, palm down, wrist at the origin; the sleeve runs back along -x out of frame
  const g = new pc.Entity(name);
  box(`${name}-palm`, [0.1, 0.03, 0.085], skin, g, [0.05, 0.0, 0]);
  ([[-0.03, 0.072], [-0.01, 0.08], [0.01, 0.077], [0.03, 0.064]] as [number, number][]).forEach(([z, len], i) =>
    box(`${name}-f${i}`, [len, 0.022, 0.019], skin, g, [0.1 + len / 2 - 0.004, -0.004, z], [0, 0, -4 - i]));
  box(`${name}-thumb`, [0.055, 0.024, 0.022], skin, g, [0.055, -0.004, 0.052], [0, -38, 0]);
  prim('cylinder', `${name}-cuff`, [0.075, 0.03, 0.075], mat(cuff), g, [-0.012, 0.002, 0], [0, 0, 90]);
  prim('cylinder', `${name}-sleeve`, [0.085, 0.75, 0.085], mat(sleeve), g, [-0.4, 0.01, 0], [0, 0, 90]);
  return g;
}

function labelCanvas(lines: string[], w: number, h: number, bg: string, ink: string, font: string, band?: string): HTMLCanvasElement {
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  if (band) { ctx.fillStyle = band; ctx.fillRect(0, 0, w, Math.round(h * 0.22)); }
  ctx.fillStyle = ink; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, w / 2, h * (band ? 0.45 : 0.3) + i * (h * 0.22)));
  return c;
}

function makeFloppy(parent: pc.Entity, label: string[]): pc.Entity {
  const g = group('floppy', parent);
  box('fl-body', [0.09, 0.0045, 0.094], C.floppy, g, [0, 0.00225, 0], [0, 0, 0], { gloss: 0.6 });
  box('fl-shutter', [0.05, 0.0012, 0.03], C.floppyShutter, g, [0.008, 0.0049, -0.032], [0, 0, 0], { gloss: 0.8 });
  const lt = canvasTexture('floppy-label', labelCanvas(label, 96, 64, C.floppyLabel, C.navy, `bold 13px ${F_MONO}`, C.teal));
  prim('plane', 'fl-label', [0.066, 1, 0.046], mat(C.white, { map: lt }), g, [0, 0.0052, 0.018]);
  return g;
}

function crossStitchSampler(): HTMLCanvasElement {
  // House Rules as a cross-stitch: text rasterised small, then every lit cell stitched as an X on aida cloth
  const [src, s] = canvas(120, 150);
  s.fillStyle = '#000'; s.fillRect(0, 0, 120, 150);
  s.fillStyle = '#fff'; s.textAlign = 'center'; s.textBaseline = 'top';
  s.font = `bold 13px ${F_MONO}`; s.fillText('HOUSE', 60, 14); s.fillText('RULES', 60, 28);
  s.font = `9px ${F_MONO}`;
  ['Doors open', 'at all times', '', 'Modest dress', '', 'House meeting', 'Sundays', '', 'Never alone'].forEach((l, i) => s.fillText(l, 60, 50 + i * 10));
  const data = s.getImageData(0, 0, 120, 150).data;
  const cell = 6, [c, ctx] = canvas(120 * cell, 150 * cell);
  ctx.fillStyle = C.paper; ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = rgba(C.sill, 0.35); ctx.lineWidth = 1;
  for (let i = 0; i <= 150; i++) { ctx.beginPath(); ctx.moveTo(0, i * cell + 0.5); ctx.lineTo(c.width, i * cell + 0.5); ctx.stroke(); }
  for (let i = 0; i <= 120; i++) { ctx.beginPath(); ctx.moveTo(i * cell + 0.5, 0); ctx.lineTo(i * cell + 0.5, c.height); ctx.stroke(); }
  const stitch = (x: number, y: number, hex: string): void => {
    ctx.strokeStyle = hex; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(x * cell + 1, y * cell + 1); ctx.lineTo(x * cell + cell - 1, y * cell + cell - 1);
    ctx.moveTo(x * cell + cell - 1, y * cell + 1); ctx.lineTo(x * cell + 1, y * cell + cell - 1); ctx.stroke();
  };
  for (let y = 0; y < 150; y++) for (let x = 0; x < 120; x++) if (data[(y * 120 + x) * 4] > 110) stitch(x, y, y < 44 ? C.hot : C.navy);
  // a border of little hearts, the way a sampler is finished
  const heart = ['0101', '1111', '0110'];
  for (let i = 0; i < 24; i++) {
    const bx = 4 + i * 5, by1 = 3, by2 = 144;
    heart.forEach((r, yy) => [...r].forEach((v, xx) => { if (v === '1') { if (bx + xx < 117) { stitch(bx + xx, by1 + yy, C.fHill); stitch(bx + xx, by2 + yy, C.fHill); } } }));
  }
  return c;
}

function guestBookPage(): HTMLCanvasElement {
  const [c, ctx] = canvas(512, 360);
  ctx.fillStyle = C.paper; ctx.fillRect(0, 0, 512, 360);
  ctx.fillStyle = C.ink; ctx.fillRect(254, 0, 4, 360);
  ctx.font = `bold 26px ${F_SERIF}`; ctx.fillStyle = C.navy; ctx.textAlign = 'center';
  ctx.fillText('Guest Book', 128, 40);
  ctx.font = `italic 15px ${F_SERIF}`; ctx.fillText('approved callers only', 128, 62);
  ctx.textAlign = 'left'; ctx.font = `bold 13px ${F_MONO}`; ctx.fillStyle = C.ink;
  for (const side of [0, 1]) {
    const x0 = side * 258 + 14;
    ctx.fillText('NAME', x0, 92 - side * 40); ctx.fillText('APPROVED Y/N', x0 + 132, 92 - side * 40);
    for (let i = 0; i < (side ? 11 : 8); i++) {
      const y = 112 + i * 26 - side * 40;
      ctx.strokeStyle = rgba(C.brand, 0.45); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + 228, y); ctx.stroke();
    }
  }
  ctx.font = `italic 17px ${F_SERIF}`; ctx.fillStyle = C.navy;
  [['Mom', 'Y'], ['Dad', 'Y'], ['Group leader', 'Y']].forEach(([n, a], i) => { ctx.fillText(n, 20, 108 + i * 26); ctx.fillText(a, 196, 108 + i * 26); });
  return c;
}

function appScreen(): HTMLCanvasElement {
  // the platform's glossy app: a streak ring and a "share your story" button (GracePlatform is the piece's mark)
  const [c, ctx] = canvas(180, 360);
  vGrad(ctx, [[0, C.skyTop], [1, C.skyLow]], 0, 0, 180, 360);
  ctx.fillStyle = C.brand; ctx.fillRect(0, 0, 180, 44);
  ctx.fillStyle = C.white; ctx.font = `bold 15px ${F_CAP}`; ctx.textAlign = 'center'; ctx.fillText('GracePlatform', 90, 28);
  ctx.lineWidth = 14; ctx.strokeStyle = rgba(C.white, 0.6); ctx.beginPath(); ctx.arc(90, 140, 52, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = C.orange; ctx.beginPath(); ctx.arc(90, 140, 52, -Math.PI / 2, Math.PI * 1.15); ctx.stroke();
  ctx.fillStyle = C.navy; ctx.font = `900 34px ${F_CHUNK}`; ctx.fillText('412', 90, 152);
  ctx.font = `bold 12px ${F_CAP}`; ctx.fillText('days walking', 90, 214);
  ctx.fillStyle = C.hot; ctx.fillRect(24, 260, 132, 40);
  ctx.fillStyle = C.white; ctx.font = `bold 14px ${F_CAP}`; ctx.fillText('Polish my story', 90, 285);
  return c;
}

function stripes(a: string, b: string, n = 16): HTMLCanvasElement {
  const [c, ctx] = canvas(256, 16);
  for (let i = 0; i < n; i++) { ctx.fillStyle = i % 2 ? a : b; ctx.fillRect(Math.floor(i * 256 / n), 0, Math.ceil(256 / n), 16); }
  return c;
}

async function build3d(): Promise<void> {
  pcCanvas = document.createElement('canvas');
  pcCanvas.width = W; pcCanvas.height = H;
  app = new pc.Application(pcCanvas, { graphicsDeviceOptions: { antialias: true, alpha: true, preserveDrawingBuffer: true } });
  app.setCanvasFillMode(pc.FILLMODE_NONE, W, H);
  app.setCanvasResolution(pc.RESOLUTION_FIXED, W, H);
  app.autoRender = false;
  await Promise.all(['cassetteTape.glb', 'vrHeadset.glb', 'cupOfTea.glb', 'lampSquareTable.glb'].map(loadGlb).map((p) => p.catch(() => {})));

  camera = new pc.Entity('cam');
  camera.addComponent('camera', { clearColor: new pc.Color(0, 0, 0, 0), fov: 38, nearClip: 0.02, farClip: 50 });
  app.root.addChild(camera);
  for (const [id, type] of [['key', 'directional'], ['fill', 'directional'], ['rim', 'directional'], ['lamp', 'omni'], ['moon', 'directional']] as const) {
    const l = new pc.Entity(id); l.addComponent('light', { type, castShadows: false, range: 4 }); app.root.addChild(l); lights[id] = l;
  }

  // ── the kitchen table at night ──────────────────────────────────────────────────────────────────────────────
  const K = groups.kitchen = group('kitchen');
  box('k-table', [1.7, 0.05, 1.0], C.wood, K, [0, 0.725, 0], [0, 0, 0], { gloss: 0.45 });
  box('k-wall', [4, 2.4, 0.05], C.wall, K, [0, 1.2, -0.75]);
  box('k-window', [0.7, 0.62, 0.02], C.windowPane, K, [0.25, 1.35, -0.72], [0, 0, 0], { emissive: true, glow: 0.8 });
  box('k-moon', [0.08, 0.08, 0.01], C.moon, K, [0.4, 1.5, -0.705], [0, 0, 0], { emissive: true });
  for (const [x, y, w, h] of [[0.25, 1.68, 0.78, 0.05], [0.25, 1.02, 0.78, 0.05], [-0.115, 1.35, 0.05, 0.7], [0.615, 1.35, 0.05, 0.7], [0.25, 1.35, 0.03, 0.62]] as [number, number, number, number][])
    box('k-frame', [w, h, 0.04], C.sill, K, [x, y, -0.7]);
  const lamp = glbs['lampSquareTable.glb'] ? model('lampSquareTable.glb', 0.36, C.accent, 0.6) : null;
  if (lamp) { K.addChild(lamp); lamp.setLocalPosition(-0.62, 0.75, -0.4); }
  const cup = glbs['cupOfTea.glb'] ? model('cupOfTea.glb', 0.11, C.mug, 0.5) : null;
  if (cup) { K.addChild(cup); cup.setLocalPosition(0.42, 0.75, -0.2); cup.setLocalEulerAngles(0, 40, 0); }
  box('k-placemat', [0.42, 0.004, 0.3], C.textile, K, [-0.05, 0.752, 0.05]);
  floppyKit = makeFloppy(K, ['LambyOS', 'Disk 1 of 1']);
  floppyKit.setLocalScale(1.25, 1.25, 1.25);
  motherHand = makeHand('mother', C.rugHi, C.textile, C.textileHi);
  teenHand = makeHand('teen', C.floorHi, C.bookAlt, C.navy);
  K.addChild(motherHand); K.addChild(teenHand);

  // ── the showroom pedestal ───────────────────────────────────────────────────────────────────────────────────
  const P = groups.parade = group('parade');
  pedestal = group('pedestal', P);
  prim('cylinder', 'ped-base', [1.25, 0.12, 1.25], mat(C.gold, { gloss: 0.85 }), pedestal, [0, 0.06, 0]);
  pedestalSpin = group('ped-spin', pedestal);
  const st = canvasTexture('ped-stripes', stripes(C.hot, C.white, 24));
  prim('cylinder', 'ped-column', [0.9, 0.5, 0.9], mat(C.white, { map: st, gloss: 0.7 }), pedestalSpin, [0, 0.37, 0]);
  prim('cylinder', 'ped-top', [1.1, 0.07, 1.1], mat(C.gold, { gloss: 0.9 }), pedestalSpin, [0, 0.655, 0]);
  prim('cylinder', 'ped-felt', [1.0, 0.012, 1.0], mat(C.navy), pedestalSpin, [0, 0.695, 0]);
  const ON = 0.70;
  const mk = (id: string): pc.Entity => { const g = group(`item-${id}`, P); g.setLocalPosition(0, ON, 0); items[id] = g; return g; };
  // the tape
  { const g = mk('tape'); const m = glbs['cassetteTape.glb'] ? model('cassetteTape.glb', 0.62, C.mixtape, 0.55) : box('tape', [0.4, 0.06, 0.26], C.mixtape, g, [0, 0.03, 0]);
    if (m.parent !== g) g.addChild(m);
    m.setLocalPosition(0, 0.02, 0); }
  // the disk
  { const g = mk('disk'); const f = makeFloppy(g, ['LambyOS', 'First Steps']); f.setLocalScale(4.2, 4.2, 4.2); f.setLocalEulerAngles(70, 0, 0); f.setLocalPosition(0, 0.2, 0.05); }
  // the streak: a CD-ROM with a little flame
  { const g = mk('streak');
    const disc = group('cd', g); disc.setLocalPosition(0, 0.22, 0); disc.setLocalEulerAngles(75, 0, 0);
    prim('cylinder', 'cd-disc', [0.42, 0.006, 0.42], mat(C.silver, { gloss: 0.95 }), disc);
    prim('cylinder', 'cd-ring', [0.25, 0.008, 0.25], mat(C.beamB, { gloss: 0.95 }), disc);
    prim('cylinder', 'cd-hole', [0.05, 0.01, 0.05], mat(C.navy), disc);
    const fl = group('flame', g); fl.setLocalPosition(0.2, 0.36, 0.08);
    prim('cone', 'flame-o', [0.13, 0.22, 0.13], mat(C.orange, { emissive: true, glow: 0.9 }), fl, [0, 0.11, 0]);
    prim('cone', 'flame-y', [0.08, 0.15, 0.08], mat(C.gold, { emissive: true }), fl, [0, 0.08, 0.02]); }
  // the platform: a phone with a glossy app
  { const g = mk('platform');
    const ph = group('phone', g); ph.setLocalPosition(0, 0.27, 0); ph.setLocalEulerAngles(-8, 0, 0);
    box('ph-body', [0.27, 0.52, 0.03], C.greyDark, ph, [0, 0, 0], [0, 0, 0], { gloss: 0.9 });
    const sc = canvasTexture('app', appScreen());
    prim('plane', 'ph-screen', [0.235, 1, 0.47], mat(C.white, { map: sc, emissive: true, glow: 0.85 }), ph, [0, 0, 0.0161], [90, 0, 0]); }
  // immersive sessions: a headset in a gift box
  { const g = mk('headset');
    box('gift-box', [0.5, 0.2, 0.42], C.hot, g, [0, 0.1, 0], [0, 0, 0], { gloss: 0.6 });
    box('gift-ribbon-a', [0.08, 0.205, 0.425], C.gold, g, [0, 0.1, 0], [0, 0, 0], { gloss: 0.8 });
    box('gift-ribbon-b', [0.505, 0.205, 0.08], C.gold, g, [0, 0.1, 0], [0, 0, 0], { gloss: 0.8 });
    box('gift-lid', [0.54, 0.05, 0.46], C.hot, g, [0, 0.3, -0.33], [-58, 0, 0], { gloss: 0.6 });
    const hs = glbs['vrHeadset.glb'] ? model('vrHeadset.glb', 0.5, C.greyDark, 0.35) : box('hs', [0.36, 0.16, 0.2], C.greyDark, g, [0, 0, 0]);
    if (hs.parent !== g) g.addChild(hs); hs.setLocalPosition(0, 0.205, 0.04); }
  // the "Let go!" box: the old things, put away
  { const g = mk('letgo');
    const card = C.sill;
    box('lg-body', [0.5, 0.34, 0.4], card, g, [0, 0.17, 0]);
    box('lg-flap1', [0.5, 0.012, 0.2], card, g, [0, 0.36, 0.27], [-55, 0, 0]);
    box('lg-flap2', [0.5, 0.012, 0.2], card, g, [0, 0.36, -0.27], [55, 0, 0]);
    box('lg-flap3', [0.2, 0.012, 0.4], card, g, [0.33, 0.37, 0], [0, 0, 62]);
    const lt = canvasTexture('letgo', (() => { const [c, x] = canvas(256, 128); x.fillStyle = card; x.fillRect(0, 0, 256, 128); x.fillStyle = C.hot; x.font = `900 58px ${F_CHUNK}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('LET GO!', 128, 58); x.font = `italic 20px ${F_SERIF}`; x.fillStyle = C.ink; x.fillText('the old things', 128, 104); return c; })());
    prim('plane', 'lg-label', [0.4, 1, 0.2], mat(C.white, { map: lt }), g, [0, 0.18, 0.2015], [90, 0, 0]);
    const tape = glbs['cassetteTape.glb'] ? model('cassetteTape.glb', 0.2, C.mixtape, 0.55) : null;
    if (tape) { g.addChild(tape); tape.setLocalPosition(-0.08, 0.32, 0.02); tape.setLocalEulerAngles(70, 20, 10); }
    box('lg-shirt', [0.22, 0.05, 0.18], C.night, g, [0.1, 0.35, -0.04], [8, -12, 6]);
    box('lg-shirt-print', [0.08, 0.052, 0.06], C.pinkTitle, g, [0.1, 0.355, -0.04], [8, -12, 6]);
    box('lg-photo', [0.13, 0.008, 0.09], C.paper, g, [0.02, 0.37, 0.1], [-20, 30, 0]); }
  // the House Rules sampler
  { const g = mk('rules');
    box('hr-frame', [0.46, 0.56, 0.04], C.wood, g, [0, 0.3, 0], [0, 0, 0], { gloss: 0.5 });
    const t = canvasTexture('sampler', crossStitchSampler());
    prim('plane', 'hr-cloth', [0.38, 1, 0.475], mat(C.white, { map: t }), g, [0, 0.3, 0.0205], [90, 0, 0]); }
  // the guest book, open
  { const g = mk('guestbook');
    const b = group('book', g); b.setLocalPosition(0, 0.12, 0); b.setLocalEulerAngles(42, 0, 0);
    box('gb-cover', [0.58, 0.02, 0.42], C.bookAlt, b, [0, -0.012, 0]);
    const t = canvasTexture('guestbook', guestBookPage());
    prim('plane', 'gb-pages', [0.55, 1, 0.39], mat(C.white, { map: t }), b, [0, 0.001, 0]); }
}

/** render the 3D scene into the pcCanvas for this state, return it */
function render3d(): HTMLCanvasElement {
  app.render();
  return pcCanvas;
}

function setCamera(eye: [number, number, number], target: [number, number, number], fov = 38, clear?: string): void {
  camera.setPosition(...eye); camera.lookAt(...target);
  camera.camera!.fov = fov;
  camera.camera!.clearColor = clear ? col(clear) : new pc.Color(0, 0, 0, 0);
}
function setLight(id: string, on: boolean, hex = C.white, intensity = 1, rot: [number, number, number] = [0, 0, 0], pos?: [number, number, number], range = 4): void {
  const l = lights[id]; l.enabled = on;
  if (!on) return;
  l.light!.color = col(hex); l.light!.intensity = intensity; l.setEulerAngles(...rot);
  if (pos) { l.setPosition(...pos); l.light!.range = range; }
}
function only(gid: string, item?: string): void {
  for (const [k, g] of Object.entries(groups)) g.enabled = k === gid;
  for (const [k, e] of Object.entries(items)) e.enabled = k === item;
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
//  THE SHOTS — each draws its own frame at local time `t` (seconds into the shot) into `ctx`
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const LAMB = [
  '....wwww..........',
  '..wwwwwwww........',
  '.wwwwwwwwwww.ff...',
  'wwwwwwwwwwwwffff..',
  'wwwwwwwwwwwwfeff..',
  'wwwwwwwwwwwwffffn.',
  'swwwwwwwwwwwwff...',
  '.ssswwwwwwwss.....',
  '..l.l....l.l......',
  '..l.l....l.l......'
];
function pixelLamb(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, legPhase: number): void {
  const cmap: Record<string, string> = { w: C.wool, s: C.woolShade, f: C.fFace, e: C.white, n: C.fFace, l: C.fLeg };
  LAMB.forEach((row, ry) => [...row].forEach((ch, rx) => {
    if (ch === '.') return;
    let yy = ry;
    if (ch === 'l' && ry === 9 && ((rx < 6) !== (legPhase > 0.5))) return;   // the legs tuck in mid-hop
    ctx.fillStyle = cmap[ch]; ctx.fillRect(Math.round(x + rx * s), Math.round(y + yy * s), Math.ceil(s), Math.ceil(s));
  }));
}

function shotIdent(ctx: CanvasRenderingContext2D, t: number): void {
  // the field: Floppysheep's own morning
  vGrad(ctx, [[0, C.fSky], [0.62, C.fSkyLow], [1, C.horizon]]);
  // the sun and its turning rays
  ctx.save(); ctx.translate(1500, 230); ctx.rotate(t * 0.35);
  for (let i = 0; i < 14; i++) { ctx.rotate(Math.PI / 7); ctx.fillStyle = rgba(C.ray, 0.45); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(900, -70); ctx.lineTo(900, 70); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = C.fSun; ctx.beginPath(); ctx.arc(1500, 230, 110, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.sunCore; ctx.beginPath(); ctx.arc(1500, 230, 70, 0, Math.PI * 2); ctx.fill();
  // hills, stepped like the game draws them
  ctx.fillStyle = C.fHillFar; ctx.beginPath(); ctx.moveTo(0, 760); for (let x = 0; x <= W; x += 48) ctx.lineTo(x, 700 - Math.round(Math.sin(x / 260) * 50 / 8) * 8); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
  ctx.fillStyle = C.fHill; ctx.fillRect(0, 800, W, 280);
  ctx.fillStyle = C.fHillDk; for (let y = 840; y < H; y += 48) ctx.fillRect(0, y, W, 8);
  // the fence
  const fx = 900;
  ctx.fillStyle = C.fFenceDk; ctx.fillRect(fx - 160, 712, 360, 20); ctx.fillRect(fx - 160, 760, 360, 20);
  ctx.fillStyle = C.fFence; ctx.fillRect(fx - 160, 704, 360, 18); ctx.fillRect(fx - 160, 752, 360, 18);
  for (const px of [fx - 150, fx + 10, fx + 170]) { ctx.fillStyle = C.fFenceDk; ctx.fillRect(px + 8, 680, 30, 140); ctx.fillStyle = C.fFence; ctx.fillRect(px, 672, 30, 140); }
  // the lamb hops it (0.9 s → 1.9 s)
  const k = clamp((t - 0.85) / 1.0);
  const lx = lerp(260, 1360, k), ly = 700 - Math.sin(k * Math.PI) * 300 + (k <= 0 || k >= 1 ? 0 : 0);
  pixelLamb(ctx, lx, ly, 12, k > 0 && k < 1 ? 1 : (Math.floor(t * 6) % 2));
  ctx.fillStyle = rgba(C.fHillDk, 0.5); ctx.beginPath(); ctx.ellipse(lx + 100, 830, 90 * (1 - 0.5 * Math.sin(k * Math.PI)), 14, 0, 0, Math.PI * 2); ctx.fill();
  // the wordmark, with the chime
  const ch = SH.ident.chime ?? 1.6;
  const tw = t - ch - 0.1;
  if (tw > 0) {
    const s = backOut(tw / 0.6);
    const mark = chunky('LambyOS', { size: 230, face: [C.white, C.wool, C.skyMid], side: C.brand, outline: C.tagline, depth: 30 });
    drawChunky(ctx, mark, W / 2, 330, s, Math.sin(tw * 2.4) * 0.02);
    const tm = chunky('™', { size: 80, face: [C.white, C.wool], side: C.brand, outline: C.tagline, depth: 10 });
    drawChunky(ctx, tm, W / 2 + 520 * s, 230, s);
    if (tw > 0.45) {
      const sub = chunky('— Home Edition —', { size: 86, face: [C.gold, C.orange], side: C.hot, outline: C.shadow, depth: 12, italic: true, font: F_SERIF });
      drawChunky(ctx, sub, W / 2, 520, backOut((tw - 0.45) / 0.5), -0.03);
    }
    flare(ctx, lerp(300, 1650, smooth(tw / 1.6)), 290, 1.0, Math.sin(clamp(tw / 1.6) * Math.PI));
    sparkleField(ctx, t, 7, 22, [200, 120, 1500, 520], 30);
  }
}

function shotKitchen(ctx: CanvasRenderingContext2D, t: number, dur: number): void {
  only('kitchen');
  ctx.fillStyle = C.night; ctx.fillRect(0, 0, W, H);
  // the hands: hers slides the disk across; theirs comes to meet it, and stops
  const kSlide = smooth((t - 1.2) / 3.6), kTeen = smooth((t - 3.8) / 2.8);
  const mx = lerp(-0.62, -0.2, kSlide);
  motherHand.setLocalPosition(mx, 0.768, 0.08); motherHand.setLocalEulerAngles(0, 8, 0);
  floppyKit.setLocalPosition(mx + 0.2, 0.751, 0.08); floppyKit.setLocalEulerAngles(0, 8, 0);
  teenHand.setLocalPosition(lerp(0.95, 0.31, kTeen), 0.768, 0.02); teenHand.setLocalEulerAngles(0, 180 - 6, 0);
  const push = smooth(t / dur);
  setCamera([lerp(0.05, 0.02, push), lerp(1.32, 1.22, push), lerp(1.0, 0.8, push)], [0, 0.8, -0.2], 42, C.night);
  app.scene.ambientLight = col(C.shadow);
  setLight('key', false); setLight('fill', false); setLight('rim', false);
  setLight('lamp', true, C.lampWarm, 2.2, [0, 0, 0], [-0.5, 1.1, -0.25], 3.2);
  setLight('moon', true, C.moonlight, 0.35, [55, -20, 0]);
  ctx.drawImage(render3d(), 0, 0);
  // the soft-focus edge of a 1997 commercial: a warm glow vignette
  const g = ctx.createRadialGradient(W / 2, H / 2, 380, W / 2, H / 2, 1150);
  g.addColorStop(0, rgba(C.lampWarm, 0)); g.addColorStop(1, rgba(C.dusk, 0.62));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // "Over 30 years of care.*" — with the second sentence
  const k2 = TL.lines.find((l) => l.id === 'k2')!;
  const ty = t - (k2.start - SH.kitchen.start) - 0.4;
  if (ty > 0) {
    const a = smooth(ty / 1.0);
    const care = chunky(TL.type.kitchen, { size: 104, face: [C.white, C.spark, C.gold], side: C.glow, outline: C.shadow, depth: 8, italic: true, font: F_SERIF });
    drawChunky(ctx, care, W / 2, 190, lerp(0.92, 1, a), 0, a);
    flare(ctx, lerp(560, 1360, smooth(ty / 2.2)), 160, 0.55, a * Math.sin(clamp(ty / 2.2) * Math.PI) * 0.8);
  }
}

const PARADE_SCHEMES: Record<string, [string, string, string]> = {
  tape: [C.hot, C.pink, C.gold], disk: [C.titleBlue, C.cyan, C.white], streak: [C.dusk, C.glow, C.orange],
  platform: [C.brand, C.skyTop, C.sunCore], headset: [C.violet, C.haze, C.pinkTitle],
  letgo: [C.orange, C.gold, C.white], rules: [C.hot, C.pink, C.sunCore], guestbook: [C.titleBlue, C.cyan, C.gold]
};
function shotProduct(ctx: CanvasRenderingContext2D, item: string, tItem: number, tShot: number): void {
  const [a, b, glow] = PARADE_SCHEMES[item];
  sunburst(ctx, W / 2, 620, tShot * 0.25, a, b, 20, glow);
  // a reflective stage floor
  vGrad(ctx, [[0, rgba(C.shadow, 0)], [1, rgba(C.shadow, 0.55)]], 0, 760, W, 320);
  only('parade', item);
  const spin = tShot * 1.1;
  pedestalSpin.setLocalEulerAngles(0, spin * 57.3 * 0.6, 0);
  const it = items[item];
  it.setLocalEulerAngles(0, Math.sin(tItem * 1.6) * 38 + (item === 'rules' || item === 'guestbook' ? 0 : tItem * 70), 0);
  it.setLocalPosition(0, 0.7 + Math.sin(tItem * 3) * 0.012, 0);
  setCamera([0, 1.2, 1.95], [0, 0.93, 0], 38);
  app.scene.ambientLight = col(C.greyDark);
  setLight('key', true, C.white, 1.5, [-45, 30, 0]);
  setLight('fill', true, C.beamB, 0.55, [-20, -120, 0]);
  setLight('rim', true, C.beamC, 0.9, [-10, 180, 0]);
  setLight('lamp', false); setLight('moon', false);
  ctx.drawImage(render3d(), 0, 0);
  // the label, punched in with a bounce
  const label = TL.type.parade[item];
  if (label) {
    const img = chunky(label, { size: 138, face: [C.white, C.spark, C.gold], side: C.hot, outline: C.shadow, depth: 18 });
    drawChunky(ctx, img, W / 2, 175, backOut((tItem - 0.15) / 0.45), Math.sin(tItem * 3) * 0.025);
  }
  if (item === 'headset') badge(ctx, 1500, 520, 150, -0.2 + Math.sin(tItem * 4) * 0.05, TL.type.headsetBadge.replace(' ', '\n'), C.lime, C.violet);
  flare(ctx, lerp(700, 1250, smooth(tItem / 1.4)), 560, 0.8, Math.sin(clamp(tItem / 1.4) * Math.PI));
  sparkleField(ctx, tShot, item.length * 31, 18, [300, 300, 1320, 520], 34);
}

function shotMontage(ctx: CanvasRenderingContext2D, m: Montage, tItem: number, tShot: number): void {
  shotProduct(ctx, m.item, tItem, tShot);
  const lab = chunky(m.label, { size: 96, face: [C.white, C.spark, C.gold], side: C.hot, outline: C.shadow, depth: 14 });
  drawChunky(ctx, lab, W / 2, 150, backOut(tItem / 0.35));
  const sub = chunky(m.sub, { size: 64, face: [C.gold, C.orange], side: C.shadow, outline: C.shadow, depth: 6, italic: true, font: F_SERIF });
  drawChunky(ctx, sub, W / 2, 262, backOut((tItem - 0.15) / 0.35));
  badge(ctx, 1520, 560, 135, 0.15 + Math.sin(tItem * 5) * 0.06, TL.type.free, C.lime, C.hot);
}

function shotMore(ctx: CanvasRenderingContext2D, t: number, tShot: number): void {
  sunburst(ctx, W / 2, H / 2, -tShot * 0.9, C.gold, C.orange, 24, C.sunCore);
  const [l1, l2] = TL.type.more;
  const a = chunky(l1, { size: 190, face: [C.white, C.spark, C.pink], side: C.hot, outline: C.shadow, depth: 24 });
  const b = chunky(l2, { size: 210, face: [C.white, C.spark, C.lime], side: C.violet, outline: C.shadow, depth: 26 });
  drawChunky(ctx, a, W / 2, 400, backOut(t / 0.35), -0.06);
  drawChunky(ctx, b, W / 2, 640, backOut((t - 0.18) / 0.35), 0.04);
  flare(ctx, W / 2 + Math.cos(t * 3) * 500, 520 + Math.sin(t * 3) * 120, 1.1, smooth(t / 0.3));
  sparkleField(ctx, tShot, 99, 30, [100, 100, 1720, 880], 40);
}

function shotFlow(ctx: CanvasRenderingContext2D, t: number): void {
  // the 1997 presentation: a sunrise sky, a cream board, a chart that draws itself
  vGrad(ctx, [[0, C.skyTop], [0.7, C.skyLow], [1, C.horizon]]);
  ctx.save(); ctx.translate(W / 2, 1150); ctx.rotate(t * 0.12);
  for (let i = 0; i < 24; i++) { ctx.rotate(Math.PI / 12); ctx.fillStyle = rgba(C.ray, 0.35); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1800, -120); ctx.lineTo(1800, 120); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = rgba(C.shadow, 0.25); ctx.fillRect(130, 250, W - 240, 700);
  ctx.fillStyle = C.card; ctx.fillRect(110, 230, W - 240, 700);
  ctx.lineWidth = 8; ctx.strokeStyle = C.gold; ctx.strokeRect(110, 230, W - 240, 700);
  const title = chunky(TL.type.flowTitle, { size: 120, face: [C.white, C.spark, C.gold], side: C.brand, outline: C.tagline, depth: 16 });
  drawChunky(ctx, title, W / 2, 150, backOut(t / 0.5), Math.sin(t * 2) * 0.015);
  const colours = [C.hot, C.cyan, C.gold, C.violet, C.lime];
  const pos: [number, number][] = [[330, 470], [700, 740], [1000, 470], [1300, 740], [1620, 520]];
  const t0 = SH.flow.start;
  TL.boxes.forEach((bt, i) => {
    const tb = t - (bt - t0);
    // the arrow from the previous box draws on just before this one pops
    if (i > 0) {
      const ka = clamp((tb + 0.45) / 0.45);
      if (ka > 0) {
        const [x0, y0] = pos[i - 1], [x1, y1] = pos[i];
        const ex = lerp(x0, x1, ka * 0.62 + 0.19), ey = lerp(y0, y1, ka * 0.62 + 0.19);
        const sx = lerp(x0, x1, 0.19), sy = lerp(y0, y1, 0.19);
        ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.strokeStyle = C.tagline;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        if (ka >= 1) { const ang = Math.atan2(y1 - y0, x1 - x0); ctx.fillStyle = C.tagline; ctx.beginPath(); ctx.moveTo(ex + Math.cos(ang) * 30, ey + Math.sin(ang) * 30); ctx.lineTo(ex + Math.cos(ang + 2.4) * 34, ey + Math.sin(ang + 2.4) * 34); ctx.lineTo(ex + Math.cos(ang - 2.4) * 34, ey + Math.sin(ang - 2.4) * 34); ctx.fill(); }
      }
    }
    if (tb <= 0) return;
    const s = backOut(tb / 0.32), [x, y] = pos[i], last = i === TL.boxes.length - 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(Math.sin(tb * 2.5 + i) * 0.03);
    if (last) {
      starPath(ctx, 0, 0, 205, tb * 0.4, 12, 0.72); ctx.fillStyle = C.shadow; ctx.translate(8, 10); ctx.fill(); ctx.translate(-8, -10);
      starPath(ctx, 0, 0, 205, tb * 0.4, 12, 0.72); ctx.fillStyle = colours[i]; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = C.white; ctx.stroke();
    } else {
      ctx.fillStyle = C.shadow; ctx.fillRect(-150 + 10, -78 + 12, 300, 156);
      ctx.fillStyle = colours[i]; ctx.fillRect(-150, -78, 300, 156);
      ctx.lineWidth = 8; ctx.strokeStyle = C.white; ctx.strokeRect(-150, -78, 300, 156);
    }
    const lab = chunky(TL.type.flow[i], { size: last ? 64 : 54, face: [C.white, C.spark], side: C.shadow, outline: C.shadow, depth: 6 });
    ctx.drawImage(lab, -lab.width / 2, -lab.height / 2);
    ctx.restore();
    if (last) { flare(ctx, x - 40, y - 60, 1.0, Math.sin(clamp(tb / 1.4) * Math.PI)); sparkleField(ctx, t, 5, 16, [x - 300, y - 260, 600, 520], 34); }
  });
}

const plateCache = new Map<string, HTMLImageElement>();
async function plate(era: number, f: number): Promise<HTMLImageElement> {
  const n = Math.max(0, Math.min(125, f));
  const key = `e${era}/${String(n).padStart(4, '0')}`;
  const hit = plateCache.get(key); if (hit) return hit;
  let img = new Image(); img.src = `plates/${key}.png`;
  try { await img.decode(); } catch { img = new Image(); img.src = `plates/e${era}/0000.png`; await img.decode(); }
  if (plateCache.size > 40) plateCache.delete(plateCache.keys().next().value!);
  plateCache.set(key, img);
  return img;
}
async function shotRooms(ctx: CanvasRenderingContext2D, t: number, dur: number): Promise<void> {
  const each = dur / 4, xf = 0.7;
  const draw = async (i: number, alpha: number): Promise<void> => {
    if (alpha <= 0) return;
    const local = t - i * each + xf / 2;
    const img = await plate(i + 1, Math.round(local * 30 * (126 / (each * 30 + xf * 30))));
    ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(img, 0, 0, W, H);
    // the year, chunky, small, in the corner — every year an update
    const yr = chunky(TL.type.rooms[i], { size: 120, face: [C.white, C.spark, C.gold], side: C.hot, outline: C.shadow, depth: 14 });
    drawChunky(ctx, yr, 260, 150, backOut((local - 0.2) / 0.4));
    const v = chunky(`v${i + 1}.0`, { size: 54, face: [C.lime, C.lime], side: C.shadow, outline: C.shadow, depth: 6 });
    drawChunky(ctx, v, 300, 255, backOut((local - 0.45) / 0.4), -0.08);
    ctx.restore();
  };
  for (let i = 0; i < 4; i++) {
    const a0 = i * each, a1 = (i + 1) * each;
    const fadeIn = i === 0 ? 1 : smooth((t - a0 + xf / 2) / xf), fadeOut = i === 3 ? 1 : 1 - smooth((t - a1 + xf / 2) / xf);
    const alpha = Math.min(fadeIn, fadeOut);
    if (t > a0 - xf / 2 && t < a1 + xf / 2) await draw(i, i === 0 ? fadeOut : alpha);
  }
  // the dream-glow of the commercial's lens, and a gentle cream wash at the edges
  const g = ctx.createRadialGradient(W / 2, H / 2, 500, W / 2, H / 2, 1200);
  g.addColorStop(0, rgba(C.wallHi, 0)); g.addColorStop(1, rgba(C.wallHi, 0.5));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

/** the pack shot, the fast small print, and the collapse — one continuous picture */
const PACK_CAM_X = 1.0, PACK_CAM_Y = 0.78;
function shotPack(ctx: CanvasRenderingContext2D, tPack: number, phase: 'pack' | 'fine' | 'collapse', kCollapse = 0, scrollY = 0, holdLamby = -1): void {
  vGrad(ctx, [[0, C.skyTop], [0.55, C.skyMid], [0.85, C.skyLow], [1, C.horizon]]);
  ctx.save(); ctx.translate(560, 640); ctx.rotate(tPack * 0.2 * (1 - kCollapse * 0.8));
  for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.fillStyle = rgba(C.ray, 0.5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1600, -150); ctx.lineTo(1600, 150); ctx.fill(); }
  ctx.restore();
  const sg = ctx.createRadialGradient(560, 640, 0, 560, 640, 520); sg.addColorStop(0, rgba(C.sunCore, 0.95)); sg.addColorStop(1, rgba(C.sun, 0));
  ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
  // the pedestal (3D), Lamby on it (the piece's Lamby: a picture, silent)
  only('parade');
  pedestalSpin.setLocalEulerAngles(0, tPack * 40 * (1 - kCollapse), 0);
  setCamera([PACK_CAM_X, 1.25, 3.4], [PACK_CAM_X, PACK_CAM_Y, 0], 38);
  app.scene.ambientLight = col(C.greyDark);
  setLight('key', true, C.white, 1.5, [-45, 30, 0]); setLight('fill', true, C.beamB, 0.55, [-20, -120, 0]);
  setLight('rim', true, C.beamC, 0.9, [-10, 180, 0]); setLight('lamp', false); setLight('moon', false);
  ctx.drawImage(render3d(), 0, 0);
  const lt = holdLamby >= 0 ? holdLamby : tPack;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  drawLambyChar(ctx, 560, 400, { mood: 'cheerful', action: 'idle', t: 1.2 + lt, moodStart: 0, scale: 3.1 });
  ctx.restore();
  // the wordmark, and the slogan building word by word
  const mark = chunky('LambyOS', { size: 200, face: [C.white, C.wool, C.skyMid], side: C.brand, outline: C.tagline, depth: 28 });
  drawChunky(ctx, mark, 1330, 270, backOut((tPack - 0.6) / 0.5), Math.sin(tPack * 1.8) * 0.015 * (1 - kCollapse));
  const tm = chunky('™', { size: 70, face: [C.white, C.wool], side: C.brand, outline: C.tagline, depth: 9 });
  drawChunky(ctx, tm, 1790, 180, backOut((tPack - 0.8) / 0.4));
  const words = TL.type.slogan.split(' ');
  const s0 = TL.slogan.start - SH.pack.start, sd = TL.slogan.end - TL.slogan.start;
  ctx.font = `900 64px ${F_CHUNK}`;
  let x = 1330 - (ctx.measureText(TL.type.slogan).width + 26 * (words.length - 1)) / 2;
  words.forEach((w, i) => {
    const tw = tPack - s0 - (i / words.length) * sd;
    const img = chunky(w, { size: 64, face: [C.navy, C.tagline], side: C.gold, outline: C.white, depth: 6 });
    const ww = ctx.measureText(w + ' ').width + 26;
    drawChunky(ctx, img, x + ww / 2, 450, backOut(tw / 0.3));
    x += ww;
  });
  if (phase === 'pack') { flare(ctx, lerp(950, 1750, smooth((tPack - 0.6) / 1.8)), 230, 0.9, Math.sin(clamp((tPack - 0.6) / 1.8) * Math.PI)); sparkleField(ctx, tPack, 3, 20, [900, 100, 900, 450], 30); }
  // the small print: too fast to read, then — by itself — not
  if (phase !== 'pack') {
    const top = 700, hgt = 210;
    ctx.fillStyle = rgba(C.tagline, 0.82); ctx.fillRect(0, top, W, hgt);
    ctx.save(); ctx.beginPath(); ctx.rect(0, top, W, hgt); ctx.clip();
    const fs = lerp(24, 34, kCollapse);
    ctx.font = `${fs}px ${F_CAP}`; ctx.fillStyle = C.white; ctx.textAlign = 'left';
    const lines = wrap(ctx, TL.type.fineFast, 1640);
    const lh = fs * 1.3, block = lines.length * lh + 60;
    for (let rep = -1; rep < 6; rep++) lines.forEach((l, i) => {
      const yy = top + hgt - (scrollY % block) + rep * block + i * lh;
      if (yy > top - lh && yy < top + hgt + lh) ctx.fillText(l, 140, yy);
    });
    ctx.restore();
  }
}

// ── the tape's last seconds, the noise, the gathering ───────────────────────────────────────────────────────────
const NOISE = [C.black, C.greyDark, C.grey, C.silver].map(rgb);
const [noiseC, noiseX] = canvas(W / 4, H / 4);
function drawNoise(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  if (alpha <= 0) return;
  const tick = Math.floor(t * 12);
  const img = noiseX.createImageData(noiseC.width, noiseC.height), r = rng(tick * 7919 + 13);
  for (let i = 0; i < noiseC.width * noiseC.height; i++) {
    const [a, b, c] = NOISE[Math.floor(r() * 4)];
    img.data[i * 4] = a; img.data[i * 4 + 1] = b; img.data[i * 4 + 2] = c; img.data[i * 4 + 3] = 255;
  }
  noiseX.putImageData(img, 0, 0);
  ctx.save(); ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = false; ctx.drawImage(noiseC, 0, 0, W, H); ctx.restore();
}

const CELL = 26, GATHER_TOP = 150;
let particles: { sx: number; sy: number; tx: number; ty: number; has: boolean }[] = [];
function buildGather(): void {
  const targets: { x: number; y: number }[] = [];
  const lineH = 7 * CELL;
  GATHER.forEach((line, li) => {
    const w = line.length * 4 * CELL - CELL;
    const x0 = Math.round((W - w) / 2), y0 = GATHER_TOP + li * lineH;
    [...line].forEach((ch, ci) => {
      const g = DOT[ch] ?? DOT[' '];
      for (let i = 0; i < 15; i++) if (g[i] === '1') targets.push({ x: x0 + ci * 4 * CELL + (i % 3) * CELL, y: y0 + Math.floor(i / 3) * CELL });
    });
  });
  const r = rng(1997);
  particles = Array.from({ length: targets.length + 260 }, (_, i) => ({ sx: r() * W, sy: r() * H, tx: targets[i]?.x ?? 0, ty: targets[i]?.y ?? 0, has: i < targets.length }));
}
const NOISE_S = 1.0, MOVE_S = 2.2;
function shotGather(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.fillStyle = C.black; ctx.fillRect(0, 0, W, H);
  const e = smooth((t - NOISE_S) / MOVE_S);
  if (t < NOISE_S + MOVE_S) drawNoise(ctx, t, 1 - e);
  if (t >= NOISE_S) {
    const dot = CELL - Math.ceil(CELL / 4);
    for (const p of particles) {
      if (!p.has && e > 0.85) continue;
      const x = p.has ? lerp(p.sx, p.tx, e) : p.sx, y = p.has ? lerp(p.sy, p.ty, e) : p.sy;
      const size = p.has && e > 0.5 ? dot : 5;
      ctx.fillStyle = p.has ? C.white : C.silver;
      ctx.globalAlpha = p.has ? 1 : 1 - e;
      ctx.fillRect(Math.round(x), Math.round(y), size, size);
    }
    ctx.globalAlpha = 1;
  }
}
/** the end card: the gathered words hold, and under them the programme's own small print — still, at last, readable
 *  (his note, 2026-10-13: the gather is great, the small print is fine but not scrolling, and no Sources line here) */
function shotEnd(ctx: CanvasRenderingContext2D, tSinceGather: number): void {
  shotGather(ctx, tSinceGather);
  const settle = NOISE_S + MOVE_S;
  const a = smooth((tSinceGather - settle - 0.4) / 1.0);
  if (a <= 0) return;
  const y = GATHER_TOP + 2 * 7 * CELL + 110;
  ctx.save(); ctx.globalAlpha = a;
  ctx.font = `bold 42px ${F_MONO}`; ctx.fillStyle = C.smallPrint; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(SMALL_PRINT, W / 2, y);
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
//  THE TAPE: VHS chroma bleed, tracking, head-switching, the counter; then the TV's own glass
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const VW = 960, VH = 540;
const [vhsC, vhsX] = canvas(VW, VH, true);
const [scanC, scanX] = canvas(W, H);
(() => { for (let y = 0; y < H; y += 3) { scanX.fillStyle = 'rgba(0,0,0,0.16)'; scanX.fillRect(0, y, W, 1); } })();
interface Tape { tracking: number; trackY: number; jitter: number; sat: number; roll: number; frame: number }
function vhs(out: CanvasRenderingContext2D, src: HTMLCanvasElement, p: Tape): void {
  // the picture's vertical roll (the chew): it slides up, the black interval between fields showing
  vhsX.fillStyle = C.black; vhsX.fillRect(0, 0, VW, VH);
  vhsX.imageSmoothingEnabled = true;
  const off = Math.round(p.roll * VH) % VH;
  vhsX.drawImage(src, 0, -off, VW, VH);
  if (off) { vhsX.drawImage(src, 0, VH - off + 18, VW, VH); vhsX.fillStyle = C.black; vhsX.fillRect(0, VH - off, VW, 18); }
  const img = vhsX.getImageData(0, 0, VW, VH), d = img.data, r = rng(p.frame * 977 + 3);
  const row = new Float32Array(VW * 3), I = new Float32Array(VW), Q = new Float32Array(VW), Ys = new Float32Array(VW);
  for (let y = 0; y < VH; y++) {
    // tracking: a band of torn lines where the heads lose the signal; head-switching at the bottom
    const band = p.tracking > 0 ? Math.exp(-Math.pow((y - p.trackY) / (18 + 40 * p.tracking), 2)) * p.tracking : 0;
    const head = y > VH - 7 ? 1 : 0;
    const shift = Math.round((r() - 0.5) * p.jitter + band * (14 + r() * 26) + head * 10);
    const o = y * VW * 4;
    for (let x = 0; x < VW; x++) {
      const sx = Math.min(VW - 1, Math.max(0, x - shift)), i = o + sx * 4;
      row[x * 3] = d[i]; row[x * 3 + 1] = d[i + 1]; row[x * 3 + 2] = d[i + 2];
    }
    // YIQ: the luma stays sharp; the chroma is smeared and late (the bleed)
    for (let x = 0; x < VW; x++) {
      const R = row[x * 3], G = row[x * 3 + 1], B = row[x * 3 + 2];
      Ys[x] = 0.299 * R + 0.587 * G + 0.114 * B;
      I[x] = 0.596 * R - 0.274 * G - 0.322 * B;
      Q[x] = 0.211 * R - 0.523 * G + 0.312 * B;
    }
    let si = 0, sq = 0; const K = 9;
    for (let x = 0; x < VW + K; x++) {
      if (x < VW) { si += I[x]; sq += Q[x]; }
      if (x - K >= 0) { si -= I[x - K]; sq -= Q[x - K]; }
      const ox = x - 2;   // the colour arrives a little after the edge
      if (ox >= 0 && ox < VW) {
        const ii = (si / K) * p.sat, qq = (sq / K) * p.sat;
        let Y = Ys[ox] + (r() - 0.5) * 9;
        if (band > 0.15 && r() < band * 0.35) Y = 235;           // the torn white streaks of a tracking error
        const j = o + ox * 4;
        d[j] = Y + 0.956 * ii + 0.621 * qq; d[j + 1] = Y - 0.272 * ii - 0.647 * qq; d[j + 2] = Y - 1.106 * ii + 1.703 * qq;
      }
    }
  }
  vhsX.putImageData(img, 0, 0);
  out.save(); out.imageSmoothingEnabled = true; out.imageSmoothingQuality = 'high';
  out.drawImage(vhsC, 0, 0, W, H);
  // the bloom of an over-driven tape
  out.globalCompositeOperation = 'lighter'; out.globalAlpha = 0.16; out.filter = 'blur(10px)';
  out.drawImage(vhsC, 0, 0, W, H);
  out.restore();
  out.drawImage(scanC, 0, 0);
}
function glass(out: CanvasRenderingContext2D, src: HTMLCanvasElement): void {
  out.drawImage(src, 0, 0);
  out.save(); out.globalCompositeOperation = 'lighter'; out.globalAlpha = 0.12; out.filter = 'blur(8px)'; out.drawImage(src, 0, 0); out.restore();
  out.drawImage(scanC, 0, 0);
}

function osd(out: CanvasRenderingContext2D, t: number, counter: number): void {
  out.save(); out.font = `40px ${F_OSD}`; out.textBaseline = 'top';
  const txt = (s: string, x: number, y: number): void => { out.fillStyle = C.black; out.fillText(s, x + 3, y + 3); out.fillStyle = C.white; out.fillText(s, x, y); };
  if (t < 3.2) txt('PLAY ▶', 90, 70);
  const m = Math.floor(counter / 60), s = Math.floor(counter % 60);
  txt(`SP  0:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`, W - 420, 70);
  out.restore();
}

// ── captions: every spoken line, and the sounds, burned in ──────────────────────────────────────────────────────
function chunks(text: string, ctx: CanvasRenderingContext2D, maxW: number): string[][] {
  ctx.font = `bold 46px ${F_CAP}`;
  const lines = wrap(ctx, text, maxW), out: string[][] = [];
  for (let i = 0; i < lines.length; i += 2) out.push(lines.slice(i, i + 2));
  return out;
}
function captions(out: CanvasRenderingContext2D, t: number): void {
  let lines: string[] | null = null, italic = false;
  const ln = TL.lines.find((l) => t >= l.start - 0.05 && t < l.end + 0.35);
  if (ln) {
    const cs = chunks(ln.text, out, 1500);
    // a long line is shown in two-line pages, each held for its share of the words
    const words = cs.map((c) => c.join(' ').split(' ').length), total = words.reduce((a, b) => a + b, 0);
    let acc = 0, idx = cs.length - 1;
    const k = (t - ln.start) / Math.max(0.1, ln.end - ln.start);
    for (let i = 0; i < cs.length; i++) { acc += words[i] / total; if (k < acc) { idx = i; break; } }
    lines = cs[idx];
  } else {
    const so = TL.sounds.filter((s) => t >= s.start && t < s.end).pop();
    if (so) { lines = [so.text]; italic = true; }
  }
  if (!lines) return;
  out.save(); out.font = `${italic ? 'italic ' : ''}bold 46px ${F_CAP}`; out.textAlign = 'center'; out.textBaseline = 'middle';
  const lh = 60, base = H - 70 - (lines.length - 1) * lh;
  lines.forEach((l, i) => {
    const w = out.measureText(l).width + 40, y = base + i * lh;
    out.fillStyle = 'rgba(0,0,0,0.8)'; out.fillRect(W / 2 - w / 2, y - lh / 2, w, lh);
    out.fillStyle = C.white; out.fillText(l, W / 2, y + 2);
  });
  out.restore();
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
//  THE FRAME
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const [outC, outX] = canvas();
const [aC, aX] = canvas();
const [bC, bX] = canvas();
const [sC, sX] = canvas();
const [holdC, holdX] = canvas();
let holdTaken = false;

function counterAt(t: number): number {
  // the tape counter keeps tape time: it slows with the stretch, and stops with the chew
  const c0 = SH.collapse.start, c1 = SH.collapse.end;
  if (t <= c0) return t;
  const k = clamp((t - c0) / (c1 - c0)), n = 200;
  let acc = 0; for (let i = 0; i < n; i++) { const kk = (i + 0.5) / n * k; acc += 1 - 0.6 * Math.pow(kk, 1.2); }
  return c0 + (acc / n) * k * (c1 - c0);
}

function paradeAt(ctx: CanvasRenderingContext2D, t: number): void {
  const s = SH.parade, ts = t - s.start;
  const order: { key: string; at: number; kind: 'product' | 'more' | 'montage'; m?: Montage }[] = [];
  for (const k of ['tape', 'disk', 'streak', 'platform', 'headset']) order.push({ key: k, at: TL.items[k], kind: 'product' });
  order.push({ key: 'more', at: TL.items.more, kind: 'more' });
  for (const m of TL.montage) order.push({ key: m.item, at: m.start, kind: 'montage', m });
  const drawAt = (o: typeof order[number], c: CanvasRenderingContext2D): void => {
    const ti = t - o.at;
    if (o.kind === 'product') shotProduct(c, o.key, ti, ts);
    else if (o.kind === 'more') shotMore(c, ti, ts);
    else shotMontage(c, o.m!, ti, ts);
  };
  // the current item, star-wiped in over the one before
  let cur = 0;
  for (let i = 0; i < order.length; i++) if (t >= order[i].at - 0.2) cur = i;
  const WIPE = 0.42;
  const k = (t - (order[cur].at - 0.2)) / WIPE;
  if (cur > 0 && k < 1) {
    drawAt(order[cur - 1], aX); drawAt(order[cur], bX);
    starWipe(ctx, aC, bC, k);
  } else if (t < order[0].at - 0.2) {
    // before the first product: the empty pedestal turning, with the first scheme
    shotProduct(ctx, 'tape', -5, ts); ctx.globalAlpha = 1;
  } else drawAt(order[cur], ctx);
}

async function drawScene(ctx: CanvasRenderingContext2D, t: number): Promise<void> {
  const s = (id: string): Shot => SH[id];
  const loc = (id: string): number => t - s(id).start;
  if (t < s('ident').end) {
    // the VCR's blue, then the picture
    shotIdent(ctx, loc('ident'));
    const blue = 1 - smooth((t - 0.75) / 0.35);
    if (blue > 0) { ctx.globalAlpha = blue; ctx.fillStyle = C.vcrBlue; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    // into the kitchen: a soft dissolve (this beat is quiet)
    const xf = (t - (s('ident').end - 0.6)) / 0.6;
    if (xf > 0) { shotKitchen(aX, t - s('kitchen').start, s('kitchen').end - s('kitchen').start); ctx.globalAlpha = smooth(xf); ctx.drawImage(aC, 0, 0); ctx.globalAlpha = 1; }
    return;
  }
  if (t < s('kitchen').end) {
    const dur = s('kitchen').end - s('kitchen').start;
    const k = (t - (s('kitchen').end - 0.45)) / 0.45;
    if (k > 0) { shotKitchen(aX, loc('kitchen'), dur); paradeAt(bX, t); starWipe(ctx, aC, bC, k); }
    else shotKitchen(ctx, loc('kitchen'), dur);
    return;
  }
  if (t < s('parade').end) {
    const k = (t - (s('parade').end - 0.5)) / 0.5;
    if (k > 0) {
      // the 1997 DVE: the chart spins in from nothing
      paradeAt(ctx, t);
      shotFlow(aX, t - s('flow').start);
      const e = smooth(k);
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate((1 - e) * Math.PI * 2); ctx.scale(e, e); ctx.drawImage(aC, -W / 2, -H / 2); ctx.restore();
    } else paradeAt(ctx, t);
    return;
  }
  if (t < s('flow').end) {
    const k = (t - (s('flow').end - 0.8)) / 0.8;
    shotFlow(ctx, loc('flow'));
    if (k > 0) { await shotRooms(aX, t - s('rooms').start, s('rooms').end - s('rooms').start); ctx.globalAlpha = smooth(k); ctx.drawImage(aC, 0, 0); ctx.globalAlpha = 1; }
    return;
  }
  if (t < s('rooms').end) {
    const k = (t - (s('rooms').end - 0.45)) / 0.45;
    if (k > 0) { await shotRooms(aX, loc('rooms'), s('rooms').end - s('rooms').start); shotPack(bX, t - s('pack').start, 'pack'); starWipe(ctx, aC, bC, k); }
    else await shotRooms(ctx, loc('rooms'), s('rooms').end - s('rooms').start);
    return;
  }
  const tPack = t - s('pack').start;
  // the scroll: fast through the disclaimer, then slowing by itself to reading speed through the collapse
  const fineAt = s('fine').start, colAt = s('collapse').start, colEnd = s('collapse').end;
  const FAST = 330, SLOW = 22;
  const scrollAt = (tt: number): number => {
    if (tt < fineAt) return 0;
    if (tt < colAt) return (tt - fineAt) * FAST;
    const d = colEnd - colAt, k = clamp((tt - colAt) / d);
    // integral of a speed easing FAST → SLOW
    const n = 120; let acc = 0; for (let i = 0; i < n; i++) { const kk = (i + 0.5) / n * k; acc += lerp(FAST, SLOW, 1 - Math.pow(1 - kk, 2.4)); }
    return (colAt - fineAt) * FAST + (acc / n) * k * d;
  };
  if (t < s('fine').end) { shotPack(ctx, tPack, t < fineAt ? 'pack' : 'fine', 0, scrollAt(t)); return; }
  if (t < s('collapse').end) {
    const kc = clamp((t - colAt) / (colEnd - colAt));
    shotPack(ctx, tPack, 'collapse', kc, scrollAt(t));
    return;
  }
  if (t < s('chew').end) {
    const tc = loc('chew');
    // the lamb's smile holds a frame too long: the last picture, frozen, while the tape chews
    if (!holdTaken) { shotPack(holdX, colEnd - s('pack').start, 'collapse', 1, scrollAt(colEnd)); holdTaken = true; }
    ctx.drawImage(holdC, 0, 0);
    const toNoise = smooth((tc - 1.3) / 0.6);
    if (toNoise > 0) drawNoise(ctx, t - s('gather').start + 10, toNoise);
    return;
  }
  if (t < s('gather').end) { shotEnd(ctx, loc('gather')); return; }
  shotEnd(ctx, t - s('gather').start);
}

function tapeState(t: number, frame: number): Tape {
  const s = SH;
  let tracking = 0, trackY = 0, jitter = 1.2, sat = 1.25, roll = 0;
  // PLAY: the tracking settles over the first second and a half
  if (t < 1.6) { tracking = 1 - smooth(t / 1.6); trackY = (VH * 0.2 + t * 260) % VH; }
  // the collapse: the tape stretching — the picture loses its hold, the colour drains a little
  if (t >= s.collapse.start && t < s.chew.start) {
    const k = clamp((t - s.collapse.start) / (s.collapse.end - s.collapse.start));
    tracking = 0.15 + 0.55 * k * k; trackY = (VH - ((t * 90) % (VH + 120))); jitter = 1.2 + 5 * k; sat = 1.25 - 0.55 * k;
  }
  // the chew: one roll, no strobe
  if (t >= s.chew.start && t < s.chew.end) {
    const tc = t - s.chew.start;
    roll = smooth((tc - 0.15) / 1.1); tracking = 0.9; trackY = (tc * 400) % VH; jitter = 9; sat = 0.6;
  }
  return { tracking, trackY, jitter, sat, roll, frame };
}

async function renderFrame(frame: number): Promise<string> {
  const t = frame / TL.fps;
  sX.save(); sX.clearRect(0, 0, W, H); await drawScene(sX, t); sX.restore();
  outX.fillStyle = C.black; outX.fillRect(0, 0, W, H);
  const onTape = t < SH.chew.start + 1.6;
  if (onTape) { vhs(outX, sC, tapeState(t, frame)); if (t < SH.chew.start + 0.2) osd(outX, t, counterAt(t)); }
  else glass(outX, sC);
  // the very end: the TV is switched off
  const off = clamp((t - (TL.duration - 0.7)) / 0.5);
  if (off > 0) { outX.fillStyle = rgba(C.black, smooth(off)); outX.fillRect(0, 0, W, H); }
  captions(outX, t);
  return outC.toDataURL('image/jpeg', 0.94);
}

async function init(timeline: Timeline): Promise<number> {
  TL = timeline;
  for (const s of TL.shots) SH[s.id] = s;
  await build3d();
  buildGather();
  return Math.round(TL.duration * TL.fps);
}

(window as unknown as Record<string, unknown>).advert = { init, renderFrame };
document.body.appendChild(outC);
