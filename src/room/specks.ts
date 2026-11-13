/**
 * ⚑ S382 (UiB job 22 Part A, item 1) — THE MOTES: one deliberate field, the same in every room.
 *
 * Sérgio, 13 Nov, of the specks behind Vera's seat: "It should be floating particles to create this imagined space and
 * connection to stars, glitches, dust and the Close." Before this they were forty faint squares in the rooms' corners,
 * a centimetre across, dimmed near the lamps — nobody could tell whether they were stars or dust. Now they are both,
 * on purpose, in the piece's one particle language (the entrance's stars, the era change's glitch, the Close's sky):
 *
 *   · SQUARE AND PIXEL-TRUE. A mote is a square of whole screen pixels (4 or 5 CSS px, like the ceiling's stars and
 *     the Close's nodes, which are squares too, at about the ceiling stars' own 0.6 opacity), snapped to the pixel
 *     grid, never soft, never rotated. In a headset, where there is no one pixel grid, a fixed small angle (0.28° /
 *     0.36°). Their warm is the Close's warm lifted toward the frame's white, so it reads on Vera's orange wall.
 *   · DUST: each drifts slowly on its own long loop (about a centimetre a second, periods of one to two minutes).
 *   · STARS: they catch the light. Crossing a lamp's light a mote brightens toward white, the way dust lights up in a
 *     beam, and each one breathes a little on its own slow clock. Never a flash: brightness is capped (0.9) and moves
 *     only as fast as a mote drifts through the light.
 *   · GLITCHES: when the piece glitches — the era change's cascade, an update's install stutter, the 1997 diary's
 *     breakout — the motes jump: a few pixel-steps sideways for a tenth of a second, some doubled, then back. The same
 *     grammar as the cascade's own (clusterMorph.ts: scale jitter, a flicker capped below full brightness).
 *   · THE CLOSE: the warm motes are the Close's warm (PLACE.sun = its person nodes), one in five is its witness-blue
 *     (PLACE.skyLo = its links). The entrance's stars still land on Daniel's room's motes (`landingPoints`) and stay.
 *
 * ONE FIELD, ALL THREE ROOMS (the brief asked: Vera's room only, or the same everywhere?). The same, because it is one
 * space that ages (R24): the opening's stars come down into Daniel's room and remain, the Close's stars rise out of
 * that same ceiling, and a field only in 2016 would make Vera's room the one room where the imagined space shows —
 * which says something the piece does not mean. Each room's motes appear from the era its room is lived in (as before).
 *
 * One mesh, one draw call; nothing allocates per frame. Under Reduce motion they keep still: no drift, no breathing,
 * no jumps. Device-reading rectangles stay clear of them (every lit screen, padded 20 px).
 */
import * as pc from 'playcanvas';
import { PLACE } from '../desktop/theme/era4';
import { FRAME } from '../desktop/theme/chrome';
import { hex } from './era1room';
import { reducedMotion } from '../state/motion';

/** each room's air (inside its walls, above its desk), its seat's eye and the direction the seat faces (x, z) */
const ROOMS = [
  { lo: [-1.95, 0.92, -0.55], hi: [1.95, 2.45, 3.5], eye: [0, 1.16, 0.7], face: [0, -1], yaw: 0 },
  { lo: [-5.55, 0.92, -0.9], hi: [-2.2, 2.45, 2.3], eye: [-4.4, 1.16, 0.7], face: [-1, 0], yaw: 93 },
  { lo: [2.2, 0.92, -0.9], hi: [5.55, 2.45, 2.3], eye: [4.6, 1.16, 0.7], face: [1, 0], yaw: 270 }
] as const;
/** the lamp each room's light-catching motes drift past (the light entity's name). Maya's room has no lamp of its own
 *  (its glow is the interface's, at the seat), so its four drift in front of her desk instead. */
const LAMPS = ['light-lamp', 'light-r2Lamp', null] as const;
export const MOTES_PER_ROOM = 34;
const LAMP_MOTES = 4;
/** of each room's motes, how many are placed where the seat looks (in its view, between the eye and the wall) */
const IN_VIEW = 16;
/** never nearer the eye than this — nothing floats in the visitor's face */
const CLEAR = 0.6;
const BASE_ALPHA = 0.62, GLINT_ALPHA = 0.3, MAX_ALPHA = 0.92, GLINT_RANGE = 0.95;
/** screen size of a mote, CSS px (browser), and its angle in a headset (degrees) */
const SIZE_PX = [4, 5], SIZE_DEG = [0.28, 0.36];

interface Mote {
  r: number; base: pc.Vec3; lamp: boolean; amp: number; w: [number, number, number]; ph: [number, number, number];
  size: number; cool: boolean; tw: number; twp: number;
  jumpT: number; jx: number; jy: number; jumpScale: number;
}

export function buildRoomSpecks(app: pc.Application, camera: pc.Entity, view?: { head(): pc.Entity; point(p: pc.Vec3): pc.Vec3 }): {
  update(dt: number, era: string, visibility: number, glitching?: boolean): void;
  /** a glitch the piece fires once (the 1997 diary's breakout): the motes jump for `seconds` */
  glitch(seconds: number): void;
  landingPoints(): pc.Vec3[];
  debug(): Record<string, unknown>;
} {
  // ── the field, placed once (seeded: the same room on every run) ──
  let seed = 2016;
  const rnd = (): number => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const motes: Mote[] = [];
  const make = (r: number, base: pc.Vec3, i: number, lamp: boolean): Mote => ({
    r, base, lamp, amp: 0.09 + rnd() * 0.07,
    w: [0.05 + rnd() * 0.06, 0.04 + rnd() * 0.05, 0.05 + rnd() * 0.06], ph: [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28],
    size: i % 4 === 0 ? 1 : 0, cool: i % 5 === 2, tw: 0.35 + rnd() * 0.5, twp: rnd() * 6.28,
    jumpT: 0, jx: 0, jy: 0, jumpScale: 1
  });
  ROOMS.forEach((room, r) => {
    const eye = new pc.Vec3(room.eye[0], room.eye[1], room.eye[2]);
    let made = 0;
    const inside = (q: pc.Vec3): boolean => q.x > room.lo[0] && q.x < room.hi[0] && q.y > room.lo[1] && q.y < room.hi[1] && q.z > room.lo[2] && q.z < room.hi[2];
    // first, where the seat looks: inside its view (±38° across, −22°…+24° up), 0.7–1.4 m out, short of the wall
    while (made < IN_VIEW) {
      const yaw = (room.yaw + (rnd() * 2 - 1) * 38) * Math.PI / 180, pitch = (-22 + rnd() * 46) * Math.PI / 180, d = 0.7 + rnd() * 0.7;
      const q = new pc.Vec3(eye.x - Math.sin(yaw) * Math.cos(pitch) * d, eye.y + Math.sin(pitch) * d, eye.z - Math.cos(yaw) * Math.cos(pitch) * d);
      if (!inside(q)) continue;
      motes.push(make(r, q, made, false)); made++;
    }
    // then the rest of the room's air, for a turn and for a headset
    while (made < MOTES_PER_ROOM - LAMP_MOTES) {
      const p = new pc.Vec3(room.lo[0] + rnd() * (room.hi[0] - room.lo[0]), room.lo[1] + rnd() * (room.hi[1] - room.lo[1]),
        room.lo[2] + rnd() * (room.hi[2] - room.lo[2]));
      if (p.distance(eye) < CLEAR) continue;
      // most of the field is in front of the seat, where it is seen; some behind, for a turn and for a headset
      const ahead = (p.x - eye.x) * room.face[0] + (p.z - eye.z) * room.face[1] > 0;
      if (!ahead && rnd() > 0.45) continue;
      motes.push(make(r, p, made, false)); made++;
    }
    // and a few that drift through the lamp's light, between it and the seat (placed once the lights exist)
    for (let k = 0; k < LAMP_MOTES; k++) motes.push(make(r, new pc.Vec3(), made + k, true));
  });
  const N = motes.length;
  const lampOf: (pc.Entity | null)[] = [null, null, null];
  let lampsPlaced = false;
  function placeLampMotes(): void {
    lampsPlaced = true;
    ROOMS.forEach((room, r) => {
      const name = LAMPS[r];
      const lamp = name ? app.root.findByName(name) as pc.Entity | null : null;
      lampOf[r] = lamp;
      const at = lamp ? lamp.getPosition().clone() : new pc.Vec3(room.eye[0] + room.face[0] * 0.9, 1.05, room.eye[2] + room.face[1] * 0.9);
      const toEye = new pc.Vec3(room.eye[0] - at.x, 0, room.eye[2] - at.z).normalize();
      const side = new pc.Vec3(-toEye.z, 0, toEye.x);
      motes.filter((m) => m.r === r && m.lamp).forEach((m, k) => {
        m.base.copy(at).add(toEye.clone().mulScalar(0.2 + k * 0.08)).add(side.clone().mulScalar((k % 2 ? 1 : -1) * (0.06 + k * 0.04)));
        m.base.y += 0.12 + k * 0.08;
      });
    });
  }

  const root = new pc.Entity('room-specks'); app.root.addChild(root);
  const positions = new Float32Array(N * 12), colors = new Float32Array(N * 16), indices: number[] = [];
  const white = hex(FRAME.bright), cool = hex(PLACE.skyLo);
  const warm = hex(PLACE.sun).lerp(hex(PLACE.sun), white, 0.4);
  for (let i = 0; i < N; i++) indices.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  const mesh = new pc.Mesh(app.graphicsDevice); mesh.setPositions(positions); mesh.setColors(colors); mesh.setIndices(indices); mesh.update(pc.PRIMITIVE_TRIANGLES);
  const mat = new pc.StandardMaterial(); mat.useLighting = false; mat.diffuse.set(0, 0, 0); mat.emissive.set(1, 1, 1);
  mat.emissiveVertexColor = true; mat.opacityVertexColor = true; mat.blendType = pc.BLEND_NORMAL; mat.depthWrite = false; mat.cull = pc.CULLFACE_NONE; mat.update();
  const mi = new pc.MeshInstance(mesh, mat, root); mi.cull = false; root.addComponent('render', { meshInstances: [mi] });

  let clock = 0, glitchHold = 0, glitchK = 0, shown = 0, lastOpacity = -1;
  const p = new pc.Vec3(), at = new pc.Vec3(), corner = new pc.Vec3(), snapped = new pc.Vec3(), rel = new pc.Vec3(), step = new pc.Vec3();
  const mask: { x: number; y: number; w: number; h: number }[] = [];
  const screens: pc.MeshInstance[] = [];
  let screenEra = '';
  function collectScreens(): void {
    screens.length = 0;
    app.root.forEach(n => { const e = n as pc.Entity; for (const m of e.render?.meshInstances ?? []) {
      if (m.mesh && (m.material as pc.StandardMaterial).emissiveMap) screens.push(m);
    } });
  }
  /** where a mote is now: its drift (frozen under Reduce motion, since the clock is) */
  const driftOf = (m: Mote, out: pc.Vec3): pc.Vec3 => out.set(
    m.base.x + Math.sin(clock * m.w[0] + m.ph[0]) * m.amp,
    m.base.y + Math.sin(clock * m.w[1] + m.ph[1]) * m.amp * 0.7,
    m.base.z + Math.cos(clock * m.w[2] + m.ph[2]) * m.amp);

  return {
    landingPoints: () => motes.filter((m) => m.r === 0 && !m.lamp).map((m) => driftOf(m, new pc.Vec3())),
    glitch(seconds) { if (!reducedMotion()) glitchHold = Math.max(glitchHold, seconds); },
    debug: () => ({ count: N, perRoom: MOTES_PER_ROOM, glitchK, shown, clock, sizes: SIZE_PX, degrees: SIZE_DEG, reduced: reducedMotion(),
      jumping: motes.filter((m) => m.jumpT > 0).length, alphaCap: MAX_ALPHA,
      lamps: lampOf.map((l) => l ? { name: l.name, on: l.enabled && (l.light?.intensity ?? 0) > 0.1, at: l.getPosition().toString() } : null),
      lampMotes: motes.filter((m) => m.lamp).map((m) => [m.r, +m.base.x.toFixed(2), +m.base.y.toFixed(2), +m.base.z.toFixed(2)]) }),
    update(dt, era, visibility, glitching = false) {
      root.enabled = visibility > 0; if (!root.enabled) return;
      if (!lampsPlaced) placeLampMotes();
      // Era 4 creates its visor on arrival; include that new reading glass too.
      if (screenEra !== era) { screenEra = era; collectScreens(); }
      const still = reducedMotion();
      if (!still) clock += dt;
      // the glitch: up fast, down over a second; never under Reduce motion
      glitchHold = Math.max(0, glitchHold - dt);
      const want = !still && (glitchHold > 0 || glitching) ? 1 : 0;
      glitchK = want > glitchK ? Math.min(1, glitchK + dt * 5) : Math.max(0, glitchK - dt * 1.2);
      if (lastOpacity !== visibility) { lastOpacity = visibility; mat.opacity = visibility; mat.update(); }
      const eye = view?.head() ?? camera;
      const cam = camera.camera!;
      const xr = !!app.xr?.active;
      mask.length = 0;
      // ⚑ S269 (his 28 Oct headset session: the room formed, then "nothing moves", the menu, the session gone) — a
      //   screen in this list can be destroyed after it was collected (in XR the floating Setup and hint planes are),
      //   and reading a dead mesh's aabb threw on EVERY frame, so nothing drew again. Skip it and collect afresh.
      let stale = false;
      for (const screen of screens) {
        if (!screen.mesh || !screen.node?.parent) { stale = true; continue; }
        if (!screen.visible || !(screen.node as pc.Entity).enabled || screen.aabb.center.distance(eye.getPosition()) > 5) continue;
        const b = screen.aabb, lo = { x: Infinity, y: Infinity }, hi = { x: -Infinity, y: -Infinity };
        for (let v = 0; v < 8; v++) {
          corner.set(b.center.x + (v & 1 ? 1 : -1) * b.halfExtents.x, b.center.y + (v & 2 ? 1 : -1) * b.halfExtents.y, b.center.z + (v & 4 ? 1 : -1) * b.halfExtents.z);
          cam.worldToScreen(view?.point(corner) ?? corner, at);
          if (at.z <= 0) continue;
          lo.x = Math.min(lo.x, at.x); lo.y = Math.min(lo.y, at.y); hi.x = Math.max(hi.x, at.x); hi.y = Math.max(hi.y, at.y);
        }
        mask.push({ x: lo.x - 20, y: lo.y - 20, w: hi.x - lo.x + 40, h: hi.y - lo.y + 40 });
      }
      if (stale) collectScreens();
      const right = eye.right, up = eye.up, fwd = eye.forward, eyeP = eye.getPosition();
      const dev = app.graphicsDevice, cssH = Math.max(1, dev.clientRect.height), dpr = dev.width / Math.max(1, dev.clientRect.width);
      const tanHalf = Math.tan(((cam.horizontalFov ? cam.fov / Math.max(0.1, cam.aspectRatio) : cam.fov) * Math.PI) / 360);
      shown = 0;
      for (let i = 0; i < N; i++) {
        const m = motes[i];
        driftOf(m, p);
        // the glitch: a jump of whole mote-steps, held a tenth of a second or so, sometimes doubled
        if (m.jumpT > 0) m.jumpT -= dt;
        if (m.jumpT <= 0) {
          m.jx = 0; m.jy = 0; m.jumpScale = 1;
          if (glitchK > 0 && rnd() < glitchK * dt * 7) {
            m.jumpT = 0.07 + rnd() * 0.15; m.jx = Math.round(rnd() * 6 - 3); m.jy = Math.round(rnd() * 4 - 2); m.jumpScale = rnd() < 0.25 ? 2 : 1;
          }
        }
        rel.sub2(p, eyeP);
        const depth = rel.dot(fwd), dist = rel.length();
        cam.worldToScreen(view?.point(p) ?? p, at);
        const hidden = depth <= 0.05 || (m.r > 0 && (era === 'e1' || era === 'e2'))
          || mask.some(b => at.x >= b.x && at.x <= b.x + b.w && at.y >= b.y && at.y <= b.y + b.h);
        // catching the light: brighter, and whiter, the nearer it drifts to its room's lit lamp
        const l = lampOf[m.r];
        let glint = 0;
        if (l && l.enabled && (l.light?.intensity ?? 0) > 0.1) {
          const d = p.distance(l.getPosition());
          if (d < GLINT_RANGE) glint = Math.pow(1 - d / GLINT_RANGE, 1.5) * Math.min(1, (l.light?.intensity ?? 0) / 1.5);
        }
        const breathe = still ? 1 : 0.84 + 0.16 * Math.sin(clock * m.tw + m.twp);
        const jumping = m.jumpT > 0;
        const alpha = hidden ? 0 : Math.min(MAX_ALPHA, (BASE_ALPHA + GLINT_ALPHA * glint) * breathe * (jumping ? 1.2 : 1));
        const base = m.cool ? cool : warm, w = Math.min(1, glint * (m.cool ? 0.4 : 0.9));
        const cr = base.r + (white.r - base.r) * w, cg = base.g + (white.g - base.g) * w, cb = base.b + (white.b - base.b) * w;
        for (let v = 0; v < 4; v++) { const o = i * 16 + v * 4; colors[o] = cr; colors[o + 1] = cg; colors[o + 2] = cb; colors[o + 3] = alpha; }
        let half = 0;
        snapped.copy(p);
        if (!hidden) {
          shown++;
          if (xr) {
            // a headset: a fixed small angle; a jump is a step of its own size
            half = dist * Math.tan((SIZE_DEG[m.size] * m.jumpScale * Math.PI / 180) / 2);
            if (jumping) { snapped.add(step.copy(right).mulScalar(m.jx * half * 2)); snapped.add(step.copy(up).mulScalar(-m.jy * half * 2)); }
          } else {
            // the browser: whole pixels on the pixel grid, wherever it drifts
            const sizeCss = SIZE_PX[m.size] * m.jumpScale, sizeDev = sizeCss * dpr;
            const sx = (Math.round(at.x * dpr - sizeDev / 2) + sizeDev / 2 + m.jx * sizeDev) / dpr;
            const sy = (Math.round(at.y * dpr - sizeDev / 2) + sizeDev / 2 + m.jy * sizeDev) / dpr;
            cam.screenToWorld(sx, sy, dist, snapped);
            half = (sizeCss / 2) * (2 * depth * tanHalf) / cssH;
          }
        }
        for (let v = 0; v < 4; v++) {
          const x = v === 0 || v === 3 ? -1 : 1, y = v < 2 ? -1 : 1, o = i * 12 + v * 3;
          positions[o] = snapped.x + (right.x * x + up.x * y) * half;
          positions[o + 1] = snapped.y + (right.y * x + up.y * y) * half;
          positions[o + 2] = snapped.z + (right.z * x + up.z * y) * half;
        }
      }
      mesh.setPositions(positions); mesh.setColors(colors); mesh.update(pc.PRIMITIVE_TRIANGLES, false);
    }
  };
}
