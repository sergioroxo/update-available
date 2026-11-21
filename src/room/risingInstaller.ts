/**
 * ⚑ S408 / 97-17 + 97-20 (UiB job 32 Part C) — THE INSTALLER RISES WITH YOU.
 *
 * His headset run, 20 Nov 21:43: "it's kind of a pity that I cannot see the Restorify installer… is there a way to wait
 * for us to be able to see that information? As, like, probably now as we are rising." Since S86 the ascent out of 1997
 * begins on "I Agree", while the installer types its changelog on the monitor below: from the top of the flight the
 * screen was a postage stamp (214420), then black (the restart, 214424). His 21 Nov answer to 97-20 keeps this one
 * installer moment (and drops 2003's second "finishing installation"), so it has to be read.
 *
 * So the installer comes up with him, the held device's grammar (src/room/heldDevice.ts; memory
 * headset-no-fades-bring-it-close): while the install screen is up, the monitor's OWN picture (the same texture, so no
 * second upload and nothing drawn twice) hangs before the eye, a little low, so the room ageing above and around it
 * stays in view. It goes when the screen does (the restart's black): a cut, never a fade.
 *  · Headset: hung at the facing the visitor had when the flight began, fixed to the moving seat (the rig), as a
 *    tablet held still in the lap rises with the chair: the head turns freely and the panel does not chase it.
 *  · Computer and phone: fixed to the view, a little below its middle (a flat screen has no comfort cost for that).
 * One plane, one draw call, only for the install's seconds; drawn over the room so a wall or the ceiling the flight
 * passes through never cuts it.
 */
import * as pc from 'playcanvas';
import { makeScreenEntity } from '../engine/screenTexture';

/** metres, in the headset: the panel's width, its distance, and how far below the eye it hangs */
const XR_W = 0.42, XR_DIST = 0.56, XR_DROP = 0.1;
/** on a flat screen: its height as a share of the view's height, and how far below the middle (share of the height) */
const FLAT_FILL = 0.5, FLAT_LOW = 0.16, FLAT_DIST = 0.6;

export interface RisingInstaller {
  /** call every frame: `show` while the install screen is up during the flight */
  update(show: boolean, head: pc.Entity, immersive: boolean): void;
  readonly visible: boolean;
}

export function mountRisingInstaller(app: pc.Application, tex: pc.Texture, aspect: number): RisingInstaller {
  const e = makeScreenEntity('rising-installer', tex, XR_W, XR_W / aspect);
  e.enabled = false;
  // over the room (the frame's own layer, which the camera already draws last), never under a wall or the ceiling
  const over = app.scene.layers.getLayerByName('XR Frame');
  if (over && e.render) e.render.layers = [over.id];
  app.root.addChild(e);
  /** the headset's facing at the start of the flight, in the rig's frame (a flat forward) */
  let local: pc.Vec3 | null = null;
  /** it hangs from the rig (headset) or the camera (a screen), never from the room: the headset's comfort layer re-parents
   *  the room's root under its own shifted world, and a panel left there is moved with the room */
  const hang = (parent: pc.Entity): void => { if (e.parent !== parent) { e.reparent(parent); } };
  return {
    get visible() { return e.enabled; },
    update(show, head, immersive) {
      if (!show) { if (e.enabled) { e.enabled = false; local = null; } return; }
      if (immersive && head.parent) {
        const rig = head.parent as pc.Entity;
        hang(rig);
        const hp = head.getLocalPosition();
        if (!local) {
          // the head's forward in the rig's frame, flattened: where he was facing when it came up
          const f = new pc.Vec3();
          head.getLocalRotation().transformVector(pc.Vec3.FORWARD, f); f.y = 0;
          if (f.lengthSq() < 1e-4) f.set(0, 0, -1);
          local = f.normalize();
        }
        e.setLocalScale(XR_W, 1, XR_W / aspect);
        e.setLocalPosition(hp.x + local.x * XR_DIST, hp.y - XR_DROP, hp.z + local.z * XR_DIST);
        e.setLocalEulerAngles(90, Math.atan2(-local.x, -local.z) * 180 / Math.PI, 0);
      } else {
        hang(head);
        const fov = (head.camera?.fov ?? 60) * Math.PI / 180;
        const viewH = 2 * FLAT_DIST * Math.tan(fov / 2);
        const h = viewH * FLAT_FILL;
        e.setLocalScale(h * aspect, 1, h);
        e.setLocalPosition(0, -viewH * FLAT_LOW, -FLAT_DIST);
        e.setLocalEulerAngles(90, 0, 0);
      }
      e.enabled = true;
    }
  };
}
