/**
 * ⚑ THE CONTROLLER — the headset's one input, wired (S147, 2026-09-16).
 *
 * Until this file the immersive build could LOOK and could not PRESS: every
 * hit test in the engine began from a mouse event (`screenRay(e)`), and an
 * immersive session raises none. CLAUDE.md's input amendment names the
 * headset's grammar — "thumbstick-select + trigger-confirm", never gaze — and
 * app.ts's `requestMove` comment has said "tomorrow's Quest trigger routes
 * through here" since R28. This is that tomorrow, kept to the law:
 *
 *   · TRIGGER (`select`) = the tap. The controller's ray goes through the same
 *     `resolveTapRay` a mouse tap does — the monitor, the workstation, the
 *     visor, the markers, the props, in the same order, with the same guards.
 *     While the menu is open the ray goes to the frame's plane instead.
 *   · GRIP (`squeezestart`) = Esc. It toggles the game menu through the bus,
 *     so the engine pauses exactly as it does for the DOM menu.
 *   · A thin WAND from each controller along its ray, so the player can see
 *     what they are pointing at. One box per hand, one material, unlit.
 *   · NOTHING is gaze-driven. Looking at a marker, a row or a screen for any
 *     length of time does nothing; only the trigger presses.
 *
 * Driven moves are not skippable by trigger any more than by pointer (app.ts
 * S86): the select is swallowed while a leg is flying.
 *
 * ⚑ Never run in a headset here — the sandbox has none. Every event name and
 * accessor is PlayCanvas 2.6's own (XrInput 'select' / 'squeezestart',
 * XrInputSource.getOrigin() / getDirection()), and the ray path it feeds is
 * the desktop's, which the walk proves. The in-headset pass is Sérgio's.
 */
import * as pc from 'playcanvas';
import type { Ray } from './xrFrame';

const WAND_LENGTH = 1.6;
const WAND_THICK = 0.004;

export interface XrInput {
  /** the primary controller's ray this frame, or null (no session / no controller) */
  ray(): Ray | null;
  /** once per frame: the wands follow the hands */
  tick(): void;
  destroy(): void;
}

export function mountXrInput(app: pc.Application, opts: {
  /** a trigger press with the menu closed */
  onSelect: (ray: Ray) => void;
  /** a trigger press with the menu open — the frame's plane takes it */
  onMenuSelect: (ray: Ray) => void;
  /** the grip: toggle the menu */
  onSqueeze: () => void;
  menuOpen: () => boolean;
  /** the wand's colour, from a theme — never a literal here */
  wandColor: pc.Color;
}): XrInput {
  const xr = app.xr;
  const wands = new Map<pc.XrInputSource, pc.Entity>();
  const mat = new pc.StandardMaterial();
  mat.useLighting = false;
  mat.diffuse = new pc.Color(0, 0, 0);
  mat.emissive = opts.wandColor;
  mat.update();

  const rayOf = (src: pc.XrInputSource): Ray | null => {
    // ⚑ never gaze: a 'gaze' source is the head, and looking presses nothing here
    if (src.targetRayMode === pc.XRTARGETRAY_GAZE) return null;
    const o = src.getOrigin();
    const d = src.getDirection();
    if (!o || !d) return null;
    const p0 = new pc.Vec3().copy(o);
    const p1 = new pc.Vec3().copy(d).mulScalar(12).add(o);
    return { p0, p1 };
  };
  /** the hand that pressed last is the one the cursor follows */
  let primary: pc.XrInputSource | null = null;

  const onAdd = (src: pc.XrInputSource): void => {
    if (src.targetRayMode === pc.XRTARGETRAY_GAZE) return;
    const e = new pc.Entity('xr-wand');
    e.addComponent('render', { type: 'box' });
    if (e.render) e.render.material = mat;
    e.setLocalScale(WAND_THICK, WAND_THICK, WAND_LENGTH);
    e.enabled = false;
    app.root.addChild(e);
    wands.set(src, e);
    primary ??= src;
  };
  const onRemove = (src: pc.XrInputSource): void => {
    wands.get(src)?.destroy();
    wands.delete(src);
    if (primary === src) primary = wands.keys().next().value ?? null;
  };
  const onSelect = (src: pc.XrInputSource): void => {
    primary = src;
    const r = rayOf(src);
    if (!r) return;
    if (opts.menuOpen()) opts.onMenuSelect(r); else opts.onSelect(r);
  };
  const onSqueeze = (src: pc.XrInputSource): void => { primary = src; opts.onSqueeze(); };

  if (xr) {
    xr.input.on('add', onAdd);
    xr.input.on('remove', onRemove);
    xr.input.on('select', onSelect);
    xr.input.on('squeezestart', onSqueeze);
    xr.on('end', () => { for (const e of wands.values()) e.enabled = false; });
  }

  return {
    ray(): Ray | null {
      if (!xr?.active || !primary) return null;
      return rayOf(primary);
    },
    tick(): void {
      const active = !!xr?.active;
      for (const [src, e] of wands) {
        const r = active ? rayOf(src) : null;
        if (!r) { e.enabled = false; continue; }
        e.enabled = true;
        const dir = new pc.Vec3().sub2(r.p1, r.p0).normalize();
        const mid = new pc.Vec3().copy(dir).mulScalar(WAND_LENGTH / 2).add(r.p0);
        e.setPosition(mid);
        e.lookAt(new pc.Vec3().copy(mid).sub(dir));   // the box's -Z looks back along the ray: its length lies on it
      }
    },
    destroy(): void {
      if (xr) {
        xr.input.off('add', onAdd);
        xr.input.off('remove', onRemove);
        xr.input.off('select', onSelect);
        xr.input.off('squeezestart', onSqueeze);
      }
      for (const e of wands.values()) e.destroy();
      wands.clear();
    }
  };
}
