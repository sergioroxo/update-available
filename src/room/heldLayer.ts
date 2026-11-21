/**
 * ⚑ S407 (UiB job 32, 97-7 and 97-9) — IN THE HEADSET, WHAT IS HELD IS IN FRONT OF THE ROOM.
 *
 * His headset run, 20 Nov: the Lamby set came to his eyes and went BEHIND the CRT ("it was behind the CRT for the computer",
 * frame 213112: only its name tag showed above the monitor), and the handheld "is clipping because of the new position of the
 * screen" (21:34:53). Measured from the seat: a held thing hangs 0.5 m before the eye (Meta's floor for anything looked at
 * for long); the headset maps the seated head 0.15 m forward of the browser's eye (xrComfort LEAN), and the 1997 CRT, ×1.2 in
 * the headset (xrGlass), puts its bezel 0.526 m from that eye. So 2.6 cm of margin, looking level and sitting still: a look
 * down at the kit window, or any lean towards the desk (6DoF; a body moves), and the room's monitor stood in front of the
 * held thing.
 *
 * A device brought to the eye is in the hand; nothing in the room can be between the eye and it. So in a headset a held
 * device (and the Lamby set on its way to the eye and held there) is drawn on its own layer, after the room, with the depth
 * cleared — the precedent is the Home window's layer (src/desktop/home/homeXr.ts). The frame's layer (the menu, the pointer's
 * ray, its tag) is mounted after this one and stays on top. The room's lights are given this layer too, so a held thing is
 * lit as it was. On the computer and the phone nothing changes (the flat seat keeps ~15 cm of margin).
 */
import * as pc from 'playcanvas';

let held: pc.Layer | null = null;
let app: pc.AppBase | null = null;
const saved = new WeakMap<pc.RenderComponent, number[]>();
const lifted = new WeakSet<pc.Entity>();

/** once, before the frame's layer is mounted (app.ts) */
export function mountHeldLayer(a: pc.AppBase, camera: pc.Entity): void {
  if (held || !camera.camera) return;
  app = a;
  held = new pc.Layer({ name: 'Held', clearDepthBuffer: true });
  a.scene.layers.pushOpaque(held); a.scene.layers.pushTransparent(held);
  camera.camera.layers = [...camera.camera.layers, held.id];
}

/** the layer's id, for a probe (null before it is mounted) */
export function heldLayerId(): number | null { return held?.id ?? null; }

/** put a held thing on the layer (on) or back on the room's own layers (off); idempotent, so it may be called every frame */
export function liftToHeldLayer(root: pc.Entity, on: boolean): void {
  if (!held || !app) return;
  if (on === lifted.has(root)) return;
  const id = held.id;
  root.forEach((n) => {
    const r = (n as pc.Entity).render;
    if (!r) return;
    if (on) { if (!saved.has(r)) saved.set(r, r.layers.slice()); r.layers = [id]; }
    else { const s = saved.get(r); if (s) { r.layers = s; saved.delete(r); } }
  });
  if (on) {
    lifted.add(root);
    for (const l of app.root.findComponents('light') as pc.LightComponent[]) if (!l.layers.includes(id)) l.layers = [...l.layers, id];
  } else lifted.delete(root);
}
