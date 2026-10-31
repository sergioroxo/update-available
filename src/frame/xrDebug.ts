/** ⚑ S270 — THE DEBUG READOUT IN THE HEADSET (`?debug=1` only). His 28 Oct session: "I opened the debug version and I
 *  cannot see the debug panel inside of the VR version" — the travel panel is DOM, and DOM does not exist in an
 *  immersive session. This is its read-only half, as a small plate low on the left of the view: where the story is,
 *  what the comfort mapping did, and the frame budget, so a headset session reports what the sandbox cannot see.
 *  Frame voice; head-locked (it is an instrument, not the room); refreshed twice a second, uploaded only then. */
import * as pc from 'playcanvas';
import { makeScreenEntity, makeScreenTexture } from '../engine/screenTexture';
import { FRAME } from '../desktop/theme/chrome';

export interface XrDebugSource {
  lines(): string[];
}

export function mountXrDebug(app: pc.AppBase, head: pc.Entity, source: XrDebugSource): void {
  const W = 512, H = 200;
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const tex = makeScreenTexture(app, canvas, true);
  const plate = makeScreenEntity('xr-debug', tex, 0.32, 0.125, true);
  const layer = new pc.Layer({ name: 'XR debug', clearDepthBuffer: true });
  app.scene.layers.pushTransparent(layer); head.camera!.layers = [...head.camera!.layers, layer.id];
  plate.render!.layers = [layer.id];
  // S271 (the 31 Oct cast: the plate sat over the helper's tooltip and window text) — lower and further left, still readable
  head.addChild(plate); plate.setLocalPosition(-0.27, -0.31, -0.8); plate.setLocalEulerAngles(90, 0, 0);
  plate.enabled = false;
  let wait = 0, last = '';
  app.on('update', (dt: number) => {
    plate.enabled = !!app.xr?.active;
    if (!plate.enabled || (wait -= dt) > 0) return;
    wait = 0.5;
    const lines = source.lines(), text = lines.join('\n');
    if (text === last) return;
    last = text;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = FRAME.glass; ctx.fillRect(0, 0, W, H);
    ctx.font = '19px "Courier New", monospace'; ctx.textBaseline = 'top'; ctx.fillStyle = FRAME.ink;
    lines.slice(0, 8).forEach((l, i) => ctx.fillText(l.slice(0, 44), 10, 8 + i * 23));
    tex.upload();
  });
}
