/** The entrance's points remain in the corners. Forty quads, one mesh/draw.
 * No labels or interaction; device-reading rectangles always stay clear. */
import * as pc from 'playcanvas';
import { PLACE } from '../desktop/theme/era4';
import { hex } from './era1room';
import { reducedMotion } from '../state/motion';

export function buildRoomSpecks(app: pc.Application, camera: pc.Entity, view?: { head(): pc.Entity; point(p: pc.Vec3): pc.Vec3 }): {
  update(dt: number, era: string, visibility: number): void;
  landingPoints(): pc.Vec3[];
} {
  const N = 40;
  // Corner-biased seed positions, kept outside the lamp/desk pools and hub.
  const points = Array.from({ length: N }, (_, i) => {
    const r = i < 14 ? 0 : i < 27 ? 1 : 2;
    const j = r === 0 ? i : r === 1 ? i - 14 : i - 27;
    const t = j / 14;
    return { r, x: r === 0 ? (j % 2 ? -1.75 : 1.78) : (r === 1 ? -5.65 : 5.65) + Math.sin(j * 7) * 0.24,
      y: 0.5 + (j * 0.157 % 1.7), z: r === 0 ? 1.3 + t * 1.7 : (j % 2 ? -0.48 : 1.85) + Math.sin(j * 5) * 0.13 };
  });
  const root = new pc.Entity('room-specks'); app.root.addChild(root);
  const positions = new Float32Array(N * 12), colors = new Float32Array(N * 16), indices: number[] = [];
  const warm = hex(PLACE.sun), cool = hex(PLACE.skyLo);
  for (let i = 0; i < N; i++) {
    const c = i % 6 === 0 ? cool : warm;
    for (let v = 0; v < 4; v++) colors.set([c.r, c.g, c.b, 0.46], i * 16 + v * 4);
    indices.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  }
  const mesh = new pc.Mesh(app.graphicsDevice); mesh.setPositions(positions); mesh.setColors(colors); mesh.setIndices(indices); mesh.update(pc.PRIMITIVE_TRIANGLES);
  const mat = new pc.StandardMaterial(); mat.useLighting = false; mat.diffuse.set(0, 0, 0); mat.emissive.set(1, 1, 1);
  mat.emissiveVertexColor = true; mat.opacityVertexColor = true; mat.blendType = pc.BLEND_NORMAL; mat.depthWrite = false; mat.cull = pc.CULLFACE_NONE; mat.update();
  const mi = new pc.MeshInstance(mesh, mat, root); mi.cull = false; root.addComponent('render', { meshInstances: [mi] });
  let clock = 0;
  const p = new pc.Vec3(), at = new pc.Vec3(), corner = new pc.Vec3();
  const mask: { x: number; y: number; w: number; h: number }[] = [];
  const screens: pc.MeshInstance[] = [];
  const lamps = ['light-lamp', 'light-r2Lamp'].map(id => app.root.findByName(id) as pc.Entity | null).filter((e): e is pc.Entity => !!e);
  let screenEra = '';
  function collectScreens(): void {
    screens.length = 0;
    app.root.forEach(n => { const e = n as pc.Entity; for (const m of e.render?.meshInstances ?? []) {
      if (m.mesh && (m.material as pc.StandardMaterial).emissiveMap) screens.push(m);
    } });
  }
  return {
    landingPoints: () => points.filter(s => s.r === 0).map((s, i) => new pc.Vec3(s.x + Math.sin(i) * 0.06, s.y + Math.sin(i * 2) * 0.08, s.z + Math.cos(i) * 0.05)),
    update(dt, era, visibility) {
      root.enabled = visibility > 0; if (!root.enabled) return;
      // Era 4 creates its visor on arrival; include that new reading glass too.
      if (screenEra !== era) { screenEra = era; collectScreens(); }
      if (!reducedMotion()) clock += dt;
      mat.opacity = visibility; mat.update();
      const eye = view?.head() ?? camera;
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
          camera.camera!.worldToScreen(view?.point(corner) ?? corner, at);
          if (at.z <= 0) continue;
          lo.x = Math.min(lo.x, at.x); lo.y = Math.min(lo.y, at.y); hi.x = Math.max(hi.x, at.x); hi.y = Math.max(hi.y, at.y);
        }
        mask.push({ x: lo.x - 20, y: lo.y - 20, w: hi.x - lo.x + 40, h: hi.y - lo.y + 40 });
      }
      if (stale) collectScreens();
      const right = eye.right, up = eye.up;
      points.forEach((s, i) => {
        p.set(s.x + Math.sin(clock * 0.06 + i) * 0.06, s.y + Math.sin(clock * 0.045 + i * 2) * 0.08, s.z + Math.cos(clock * 0.04 + i) * 0.05);
        camera.camera!.worldToScreen(view?.point(p) ?? p, at);
        const hidden = (s.r > 0 && (era === 'e1' || era === 'e2')) || mask.some(b => at.x >= b.x && at.x <= b.x + b.w && at.y >= b.y && at.y <= b.y + b.h);
        const lampDistance = Math.min(...lamps.filter(l => (l.light?.intensity ?? 0) > 0.1).map(l => p.distance(l.getPosition())), 3);
        const alpha = hidden ? 0 : 0.46 * Math.max(0.08, Math.min(1, (lampDistance - 0.65) / 1.3));
        for (let v = 0; v < 4; v++) colors[i * 16 + v * 4 + 3] = alpha;
        const half = hidden ? 0 : 0.004 + (i % 3) * 0.0012;
        for (let v = 0; v < 4; v++) {
          const x = v === 0 || v === 3 ? -1 : 1, y = v < 2 ? -1 : 1, o = i * 12 + v * 3;
          positions[o] = p.x + (right.x * x + up.x * y) * half;
          positions[o + 1] = p.y + (right.y * x + up.y * y) * half;
          positions[o + 2] = p.z + (right.z * x + up.z * y) * half;
        }
      });
      mesh.setPositions(positions); mesh.setColors(colors); mesh.update(pc.PRIMITIVE_TRIANGLES, false);
    }
  };
}
