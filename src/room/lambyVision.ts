/**
 * ⚑ S394 (UiB job 27 Part B1; his 15 Nov: "should we just make a Lamby Branded TV from old time and just use that with all
 * the Rooms? … that way it is clear that it is separate from the main narrative"; "Yes LambyTV", after the 1990s character
 * kids' TVs with a VCR below, speaker "ears" and little feet) — LAMBYVISION, THE PROGRAMME'S OWN SET.
 *
 * One old-time set, the same in all three rooms for thirty years: the tapes change, the set does not (the reasons pile up and
 * never change). An invented mark only — Lamby's own head as a television, never any studio's shapes, ears, colours or logo:
 *  · a rounded body in Lamby's wool (LambyOS Home's `wool`), the VCR/DVD deck below the glass in the same body, its fascia in
 *    the wool's shade; a tuft of wool on the top;
 *  · Lamby's ears are the speakers: two drooping ears in Lamby's dark grey (`lambFace`) with a grille on each;
 *  · four small hooves (the same dark grey);
 *  · on the bezel above the glass, the badge: Lamby's own face (src/desktop/apps/lambyChar.ts, the one definition) and the
 *    name, printed on the set's fascia;
 *  · on the deck: power, the tape/disc slot with its light, and ⏮ ▶ ❚❚ ⏭ ⏏ — printed keys over raised ones.
 * Every colour is imported from src/desktop/theme/ (CLAUDE.md: never invent colours).
 *
 * THE BUILD (B1: ≤ 75 draw calls in every headset look; never batched — it moves): the whole set is ONE mesh — the body with
 * vertex colours (boxes, cylinders and spheres from the engine's own geometry, merged — the racket's recipe, racketMesh.ts) and
 * the badge and the deck's keys as two quads printed from a small canvas (uploaded only when a key lights); the body's
 * vertices all sample one white block of that canvas, so one material draws both: ONE draw call, two while the glass is lit
 * (teachingTv.ts lays the glass on it). About 1,900 triangles.
 *
 * The set's frame: origin at the floor under its hooves, +Y up, the glass facing +Z. Every number here is in metres in that
 * frame; the TV module places the set (data/room/teaching_tvs.json) and scales it when it is held in a headset.
 */
import * as pc from 'playcanvas';
import { HOME } from '../desktop/theme/home';
import { ERA1 } from '../desktop/theme/era1';
import { WALL } from '../desktop/theme/era4';
import { INSTITUTION } from '../desktop/theme/institution';
import { FACES, VENDORED } from '../desktop/theme/fonts';
import { drawLambyChar } from '../desktop/apps/lambyChar';
import { makeScreenTexture } from '../engine/screenTexture';

type V3 = [number, number, number];
export type SetKey = 'power' | 'prev' | 'play' | 'pause' | 'next' | 'eject';

/** the body */
const W = 0.52, D = 0.38, FEET = 0.03, H = 0.56, R = 0.06;
const FRONT = D / 2;
/** the glass: 4:3, the picture in its upper three quarters and the bar (captions, the margin) in the lower quarter */
export const GLASS = { cx: 0, cy: 0.345, w: 0.4, h: 0.3, z: FRONT + 0.0085 } as const;
/** the deck's keys: one row under the glass (power at the left, then the transport) */
const KEY_Y = 0.14, KEY_W = 0.052, KEY_H = 0.038;
const KEYS: { id: SetKey; x: number }[] = [
  { id: 'power', x: -0.195 },
  { id: 'prev', x: -0.094 }, { id: 'play', x: -0.032 }, { id: 'pause', x: 0.03 }, { id: 'next', x: 0.092 }, { id: 'eject', x: 0.154 }
];
/** the printed strip over the keys, and the badge over the glass (both on the decal canvas) */
const STRIP = { x0: -0.228, x1: 0.188, y0: KEY_Y - 0.026, y1: KEY_Y + 0.026, z: FRONT + 0.0105 };
/** the keys' row (the printed strip), for the probes: nothing may hang over it while the set is held */
export const KEY_ROW = STRIP;
const BADGE = { cx: 0, cy: 0.553, w: 0.17, h: 0.05, z: FRONT + 0.0062 };
/** the glass's top to the keys' foot: what a flat screen fills when the set is held (the keys must be pressable) */
export const FACE = { top: GLASS.cy + GLASS.h / 2, bottom: KEY_Y - KEY_H / 2, cx: 0, width: 0.46 } as const;
/** the whole set, for a press at rest and the body's press in the hand (ears and tuft included) */
export const BOUNDS = { min: [-0.4, 0, -D / 2] as V3, max: [0.4, 0.665, FRONT + 0.012] as V3 };
export const KEY_POINTS: { id: SetKey; at: V3; r: number }[] = KEYS.map((k) => ({ id: k.id, at: [k.x, KEY_Y, STRIP.z] as V3, r: 0.031 }));

const col = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

interface Acc { p: number[]; n: number[]; c: number[]; i: number[]; uv: number[] }
function add(acc: Acc, g: pc.Geometry, m: pc.Mat4, hex: string): void {
  const [r, gg, b] = col(hex);
  const nm = m.clone().invert().transpose();
  const base = acc.p.length / 3, v = new pc.Vec3();
  const P = g.positions as number[], N = g.normals as number[];
  for (let k = 0; k < P.length; k += 3) {
    m.transformPoint(v.set(P[k], P[k + 1], P[k + 2]), v); acc.p.push(v.x, v.y, v.z);
    nm.transformVector(v.set(N[k], N[k + 1], N[k + 2]), v).normalize(); acc.n.push(v.x, v.y, v.z);
    acc.c.push(r, gg, b, 1);
    acc.uv.push(WHITE_UV[0], WHITE_UV[1]);
  }
  for (const idx of g.indices as number[]) acc.i.push(idx + base);
}
const trs = (t: V3, r: V3 = [0, 0, 0], s: V3 = [1, 1, 1]): pc.Mat4 =>
  new pc.Mat4().setTRS(new pc.Vec3(...t), new pc.Quat().setFromEulerAngles(r[0], r[1], r[2]), new pc.Vec3(...s));
const box = (hx: number, hy: number, hz: number): pc.Geometry => new pc.BoxGeometry({ halfExtents: new pc.Vec3(hx, hy, hz) });
const cyl = (r: number, h: number, seg = 12): pc.Geometry => new pc.CylinderGeometry({ radius: r, height: h, heightSegments: 1, capSegments: seg });
const ball = (lat = 6, lon = 10): pc.Geometry => new pc.SphereGeometry({ radius: 1, latitudeBands: lat, longitudeBands: lon });

/** the body: one vertex-coloured mesh */
function bodyGeometry(): Acc {
  const a: Acc = { p: [], n: [], c: [], i: [], uv: [] };
  const wool = HOME.wool, shade = HOME.woolShade, dark = HOME.lambFace;
  const cy = FEET + H / 2;
  // a rounded box seen from the front: two crossed boxes and four corner cylinders along Z
  add(a, box(W / 2, H / 2 - R, D / 2), trs([0, cy, 0]), wool);
  add(a, box(W / 2 - R, H / 2, D / 2), trs([0, cy, 0]), wool);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) add(a, cyl(R, D, 10), trs([sx * (W / 2 - R), cy + sy * (H / 2 - R), 0], [90, 0, 0]), wool);
  // the tube's hump at the back (a 1990s set is deep)
  add(a, box(W / 2 - 0.07, H / 2 - 0.08, 0.05), trs([0, cy + 0.02, -D / 2 - 0.045]), shade);
  // the bezel round the glass, and the dark glass under the picture plane
  add(a, box(0.225, 0.172, 0.004), trs([0, GLASS.cy, FRONT + 0.002]), shade);
  add(a, box(GLASS.w / 2, GLASS.h / 2, 0.003), trs([0, GLASS.cy, FRONT + 0.005]), ERA1.black);
  // the deck below the glass (the VCR / DVD player in one body), its slot and its light
  add(a, box(0.236, 0.07, 0.004), trs([0, 0.115, FRONT + 0.002]), shade);
  add(a, box(0.12, 0.011, 0.003), trs([0.02, 0.072, FRONT + 0.005]), ERA1.black);
  add(a, box(0.006, 0.006, 0.003), trs([0.165, 0.072, FRONT + 0.0055]), ERA1.ok);
  // the keys, raised (their faces are printed on the strip in front of them)
  for (const k of KEYS) add(a, box(KEY_W / 2, KEY_H / 2, 0.004), trs([k.x, KEY_Y, FRONT + 0.006]), k.id === 'power' ? dark : ERA1.silver);
  // the badge's plate above the glass
  add(a, box(BADGE.w / 2 + 0.004, BADGE.h / 2 + 0.004, 0.003), trs([BADGE.cx, BADGE.cy, FRONT + 0.003]), shade);
  // the ears: drooping, Lamby's dark grey, each with its grille (the speakers)
  for (const s of [-1, 1]) {
    const ear = trs([s * 0.29, 0.53, 0.02], [0, 0, s * -32]);
    const part = (g: pc.Geometry, local: pc.Mat4, hex: string): void => add(a, g, new pc.Mat4().mul2(ear, local), hex);
    part(ball(6, 12), trs([s * 0.035, 0, 0], [0, 0, 0], [0.09, 0.055, 0.04]), dark);
    part(cyl(0.036, 0.006, 12), trs([s * 0.04, 0, 0.038], [90, 0, 0]), ERA1.greyDark);
    for (const dy of [-0.016, 0, 0.016]) part(box(0.026, 0.0028, 0.002), trs([s * 0.04, dy, 0.042]), dark);
  }
  // the hooves
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(a, cyl(0.028, FEET + 0.004, 10), trs([sx * 0.19, FEET / 2, sz * 0.12]), dark);
  // a tuft of wool on the top
  const tuft: [number, number, number, number][] = [[-0.05, 0.6, 0.05, 0.042], [0.035, 0.603, 0.03, 0.036], [-0.005, 0.622, -0.02, 0.034], [0.07, 0.596, -0.05, 0.028]];
  for (const [x, y, z, r] of tuft) {
    add(a, ball(5, 8), trs([x, y, z], [0, 0, 0], [r, r * 0.85, r]), wool);
  }
  return a;
}

/** the printed decal canvas: the keys' strip (top, 1024 × 112), the badge (448 × 132), the white block, and ⚑ S396 the deck's
 *  display (520 × 113, under the keys: the only place the set shows its state — his "a play button on the screen for a TV that
 *  already has a play button, that is unnecessary") */
const DECAL = { w: 1024, h: 384, strip: { x: 0, y: 0, w: 1024, h: 112 }, badge: { x: 0, y: 124, w: 448, h: 132 }, white: { x: 512, y: 140, w: 480, h: 112 },
  display: { x: 0, y: 266, w: 520, h: 113 } };
/** the display's window on the deck, left of the slot (set metres) */
export const DISPLAY = { x0: -0.226, x1: -0.106, y0: 0.059, y1: 0.085, z: FRONT + 0.0065 };
/** what the deck shows: `mode` lights its lamps, `word` and `time` are its display (the words are data: teaching_tv.json `deck`) */
export interface DeckState { mode: 'off' | 'ready' | 'load' | 'play' | 'pause' | 'stop' | 'end' | 'error'; word: string; time: string }
/** the body's one texel: the middle of a white block (every body vertex has this UV, so its derivative is nil: level 0, white) */
const WHITE_UV: [number, number] = [(DECAL.white.x + DECAL.white.w / 2) / DECAL.w, (DECAL.white.y + DECAL.white.h / 2) / DECAL.h];

function quad(acc: Acc, x0: number, y0: number, x1: number, y1: number, z: number,
  r: { x: number; y: number; w: number; h: number }): void {
  const b = acc.p.length / 3;
  // the canvas is uploaded top row first (v = 0 at its top): the quad's foot takes the region's foot
  const u0 = r.x / DECAL.w, u1 = (r.x + r.w) / DECAL.w, v0 = (r.y + r.h) / DECAL.h, v1 = r.y / DECAL.h;
  acc.p.push(x0, y0, z, x1, y0, z, x1, y1, z, x0, y1, z);
  acc.n.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);
  acc.uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
  acc.c.push(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1);
  acc.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
}

export interface LambySet {
  /** the set's own node (place it, turn it, scale it); its children are the body, the decal and the glass the TV adds */
  readonly root: pc.Entity;
  /** the self-light of the body and the print: `rest` in the room, more while held (its face turned away from the lamp) */
  glow(k: number): void;
  /** light one key for a moment (a press answered), or none */
  light(key: SetKey | null): void;
  /** ⚑ S396 — the deck shows the state: ▶ lit while it plays, ❚❚ lit while it is paused, and the display under the keys
   *  (printed again only when the words change: a state, or the counter's second) */
  deck(state: DeckState): void;
  /** the decal canvas, for the review aids */
  readonly decal: HTMLCanvasElement;
}

/** where a key sits on the decal's strip (canvas px) */
function keyRect(k: { x: number }): { cx: number; cy: number; kw: number; kh: number; x: number; y: number } {
  const S = DECAL.strip, sx = S.w / (STRIP.x1 - STRIP.x0), sy = S.h / (STRIP.y1 - STRIP.y0);
  const cx = S.x + (k.x - STRIP.x0) * sx, cy = S.y + (STRIP.y1 - KEY_Y) * sy;
  const kw = KEY_W * sx, kh = KEY_H * sy;
  return { cx, cy, kw, kh, x: Math.round(cx - kw / 2), y: Math.round(cy - kh / 2) };
}
/** ⚑ S396 (review aid, the probe) — the decal's pixels that show the state: each key's lamp, and the display */
export function deckPixels(): { lamps: Record<SetKey, { x: number; y: number; w: number; h: number }>; display: { x: number; y: number; w: number; h: number } } {
  const lamps = {} as Record<SetKey, { x: number; y: number; w: number; h: number }>;
  for (const k of KEYS) { const r = keyRect(k); lamps[k.id] = { x: r.x + 10, y: r.y + 12, w: 20, h: 20 }; }
  return { lamps, display: { ...DECAL.display } };
}
/** the set's printing: each key's face and mark, the slot's label, the badge, the display */
function drawDecal(c: CanvasRenderingContext2D, lit: SetKey | null, deck: DeckState): void {
  c.clearRect(0, 0, DECAL.w, DECAL.h);
  c.fillStyle = ERA1.white; c.fillRect(DECAL.white.x, DECAL.white.y, DECAL.white.w, DECAL.white.h);
  // the strip: the deck's fascia colour, the keys where the raised keys are
  const S = DECAL.strip;
  c.fillStyle = HOME.woolShade; c.fillRect(S.x, S.y, S.w, S.h);
  for (const k of KEYS) {
    const { cx, cy, kw, kh, x, y } = keyRect(k);
    const face = k.id === 'power' ? HOME.lambFace : k.id === 'play' ? WALL.accent : ERA1.silver;
    // a 1990s key: a light top edge, a dark foot, the face
    c.fillStyle = ERA1.greyDark; c.fillRect(x, y, Math.round(kw), Math.round(kh));
    c.fillStyle = k.id === lit ? ERA1.white : face; c.fillRect(x + 3, y + 3, Math.round(kw) - 6, Math.round(kh) - 8);
    c.fillStyle = k.id === 'power' ? ERA1.grey : ERA1.white; c.fillRect(x + 3, y + 3, Math.round(kw) - 6, 4);
    c.fillStyle = k.id === 'power' ? (k.id === lit ? HOME.lambFace : ERA1.paper) : ERA1.black;
    mark(c, k.id, Math.round(cx), Math.round(cy) - 1, Math.round(kh * 0.42));
    // ⚑ S396 — the key that is ON carries its lamp: ▶ green while it plays, ❚❚ amber while it is paused, ⏻ green while it is lit
    // ⚑ S424 (16-7; storyboard beat 5: the set "arrives stopped on its first picture, ▶ lit") — and ▶ is lit while the tape waits
    //   at its label (`ready`): the one key that starts it, the deck's own invitation; nothing plays until it is pressed
    const on = (k.id === 'play' && (deck.mode === 'play' || deck.mode === 'load' || deck.mode === 'ready')) || (k.id === 'pause' && deck.mode === 'pause') || (k.id === 'power' && deck.mode !== 'off');
    if (on) { c.fillStyle = ERA1.black; c.fillRect(x + 7, y + 9, 26, 26); c.fillStyle = k.id === 'pause' ? WALL.accent : INSTITUTION.terminalGlow; c.fillRect(x + 10, y + 12, 20, 20); }
  }
  // ⚑ S396 — the display under the keys: a VCR's own window, its state and its counter (nothing is drawn on the glass)
  const Dp = DECAL.display;
  c.fillStyle = HOME.lambFace; c.fillRect(Dp.x, Dp.y, Dp.w, Dp.h);
  c.fillStyle = INSTITUTION.screenBg; c.fillRect(Dp.x + 6, Dp.y + 6, Dp.w - 12, Dp.h - 12);
  c.textBaseline = 'middle'; c.textAlign = 'left'; c.font = `64px "${VENDORED.bitmap}", ${FACES.e1.family}`;
  c.fillStyle = deck.mode === 'pause' ? WALL.accent : INSTITUTION.screenInk;
  if (deck.word && deck.mode !== 'off') c.fillText(deck.word, Dp.x + 22, Dp.y + Dp.h / 2 + 2);
  c.textAlign = 'right'; if (deck.time && deck.mode !== 'off') c.fillText(deck.time, Dp.x + Dp.w - 22, Dp.y + Dp.h / 2 + 2);
  c.textAlign = 'left';
  // the badge: Lamby's face and the name
  const B = DECAL.badge;
  c.fillStyle = HOME.wool; c.fillRect(B.x, B.y, B.w, B.h);
  c.fillStyle = HOME.woolShade; c.fillRect(B.x, B.y + B.h - 6, B.w, 6);
  c.save(); c.beginPath(); c.rect(B.x, B.y, B.w, B.h); c.clip();
  c.imageSmoothingEnabled = false;
  drawLambyChar(c, B.x + 72, B.y + 86, { mood: 'cheerful', action: 'idle', t: 0, moodStart: 0, scale: 1.45, headOnly: true });
  c.restore();
  c.fillStyle = HOME.lambFace; c.textBaseline = 'middle'; c.textAlign = 'left';
  c.font = `46px "${VENDORED.bitmap}", ${FACES.e1.family}`;
  c.fillText(SET_NAME, B.x + 146, B.y + B.h / 2 - 2);
}

/** a key's mark, drawn (not a font's glyph: every face draws it the same) */
function mark(c: CanvasRenderingContext2D, id: SetKey, x: number, y: number, s: number): void {
  const tri = (ax: number, dir: number, w: number): void => { c.beginPath(); c.moveTo(ax, y - s / 2); c.lineTo(ax + dir * w, y); c.lineTo(ax, y + s / 2); c.closePath(); c.fill(); };
  const bar = (bx: number, w: number): void => { c.fillRect(Math.round(bx), Math.round(y - s / 2), Math.round(w), Math.round(s)); };
  switch (id) {
    case 'play': tri(x - s * 0.4, 1, s * 0.85); break;
    case 'pause': bar(x - s * 0.42, s * 0.3); bar(x + s * 0.12, s * 0.3); break;
    case 'prev': bar(x - s * 0.62, s * 0.18); tri(x + s * 0.45, -1, s * 0.85); break;
    case 'next': tri(x - s * 0.45, 1, s * 0.85); bar(x + s * 0.44, s * 0.18); break;
    case 'eject': {
      c.beginPath(); c.moveTo(x - s * 0.55, y + s * 0.12); c.lineTo(x, y - s * 0.55); c.lineTo(x + s * 0.55, y + s * 0.12); c.closePath(); c.fill();
      c.fillRect(Math.round(x - s * 0.55), Math.round(y + s * 0.3), Math.round(s * 1.1), Math.round(s * 0.2)); break;
    }
    case 'power': {
      c.lineWidth = Math.max(3, s * 0.16); c.strokeStyle = c.fillStyle as string;
      c.beginPath(); c.arc(x, y + s * 0.06, s * 0.42, -Math.PI * 0.32, Math.PI * 1.32); c.stroke();
      c.fillRect(Math.round(x - c.lineWidth / 2), Math.round(y - s * 0.55), Math.round(c.lineWidth), Math.round(s * 0.5)); break;
    }
  }
}

/** ⚑ the set's name (T87, for his eye): in the LambyOS family, as LambyOS Home, Lamblippy and Lambient are */
export const SET_NAME = 'LambyVision';

export function buildLambySet(app: pc.AppBase, name: string): LambySet {
  const root = new pc.Entity(name);
  // the print (the badge and the keys), and the white block every body vertex samples
  const canvas = document.createElement('canvas');
  canvas.width = DECAL.w; canvas.height = DECAL.h;
  const ctx = canvas.getContext('2d');
  const tex = makeScreenTexture(app, canvas, 'minify');
  // the set: the body and the two printed quads in ONE mesh
  const g = bodyGeometry();
  quad(g, STRIP.x0, STRIP.y0, STRIP.x1, STRIP.y1, STRIP.z, DECAL.strip);
  quad(g, BADGE.cx - BADGE.w / 2, BADGE.cy - BADGE.h / 2, BADGE.cx + BADGE.w / 2, BADGE.cy + BADGE.h / 2, BADGE.z, DECAL.badge);
  quad(g, DISPLAY.x0, DISPLAY.y0, DISPLAY.x1, DISPLAY.y1, DISPLAY.z, DECAL.display);
  const mesh = new pc.Mesh(app.graphicsDevice);
  mesh.setPositions(g.p); mesh.setNormals(g.n); mesh.setColors(g.c); mesh.setUvs(0, g.uv); mesh.setIndices(g.i); mesh.update(pc.PRIMITIVE_TRIANGLES);
  const mat = new pc.StandardMaterial();
  mat.diffuse.set(1, 1, 1); mat.diffuseVertexColor = true; mat.diffuseMap = tex;
  mat.emissiveVertexColor = true; mat.emissiveMap = tex; mat.emissive.set(0.3, 0.3, 0.3);
  mat.gloss = 0.35; mat.useMetalness = false; mat.update();
  const body = new pc.Entity(`${name}-body`);
  body.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, mat, body)] });
  if (body.render) body.render.batchGroupId = -1;   // never batched: it moves
  root.addChild(body);
  let lit: SetKey | null = null, drawnFonts = false, deckState: DeckState = { mode: 'off', word: '', time: '' };
  const paint = (): void => { if (ctx) { drawDecal(ctx, lit, deckState); tex.upload(); } };
  paint();
  // the name's face may still be loading at the first paint: printed again once, when the fonts are in
  void document.fonts?.ready.then(() => { if (!drawnFonts) { drawnFonts = true; paint(); } });
  return {
    root, decal: canvas,
    glow(k) { mat.emissive.set(k, k, k); mat.update(); },
    light(key) { if (key === lit) return; lit = key; paint(); },
    deck(st) { if (st.mode === deckState.mode && st.word === deckState.word && st.time === deckState.time) return; deckState = { ...st }; paint(); }
  };
}

/** a ray (world) taken into the set's own frame (its world transform, scale included) */
export function toLocal(root: pc.Entity, ray: { p0: pc.Vec3; p1: pc.Vec3 }): { a: pc.Vec3; b: pc.Vec3 } {
  const inv = root.getWorldTransform().clone().invert();
  return { a: inv.transformPoint(ray.p0), b: inv.transformPoint(ray.p1) };
}
/** where a local ray enters the set's box, as a fraction of the ray (or null) */
export function hitBounds(a: pc.Vec3, b: pc.Vec3): number | null {
  let t0 = 0, t1 = 1;
  const A = [a.x, a.y, a.z], Bv = [b.x - a.x, b.y - a.y, b.z - a.z];
  for (let k = 0; k < 3; k++) {
    if (Math.abs(Bv[k]) < 1e-12) { if (A[k] < BOUNDS.min[k] || A[k] > BOUNDS.max[k]) return null; continue; }
    let ta = (BOUNDS.min[k] - A[k]) / Bv[k], tb = (BOUNDS.max[k] - A[k]) / Bv[k];
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
    if (t0 > t1) return null;
  }
  return t0;
}
/** the nearest key a local ray passes within its radius of (`minR` local metres: the headset's wider catch) */
export function keyAt(a: pc.Vec3, b: pc.Vec3, minR = 0): { id: SetKey; d: number } | null {
  const d = new pc.Vec3().sub2(b, a), len2 = d.lengthSq();
  let best: { id: SetKey; d: number } | null = null;
  for (const k of KEY_POINTS) {
    const q = new pc.Vec3(...k.at);
    const t = Math.max(0, Math.min(1, new pc.Vec3().sub2(q, a).dot(d) / len2));
    const dist = new pc.Vec3().add2(a, d.clone().mulScalar(t)).distance(q);
    if (dist <= Math.max(k.r, minR) && (!best || dist < best.d)) best = { id: k.id, d: dist };
  }
  return best;
}
/** the glass under a local ray: [0..1] across and down, or null */
export function glassAt(a: pc.Vec3, b: pc.Vec3): { u: number; v: number } | null {
  const dz = b.z - a.z;
  if (Math.abs(dz) < 1e-9) return null;
  const t = (GLASS.z - a.z) / dz;
  if (t < 0 || t > 1) return null;
  const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
  const u = (x - (GLASS.cx - GLASS.w / 2)) / GLASS.w, v = ((GLASS.cy + GLASS.h / 2) - y) / GLASS.h;
  return u >= 0 && u <= 1 && v >= 0 && v <= 1 ? { u, v } : null;
}
