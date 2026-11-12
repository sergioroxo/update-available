/** ⚑ S270 — THE DEBUG READOUT IN THE HEADSET (`?debug=1` only). His 28 Oct session: "I opened the debug version and I
 *  cannot see the debug panel inside of the VR version" — the travel panel is DOM, and DOM does not exist in an
 *  immersive session. This is its read-only half, as a small plate low on the left of the view: where the story is,
 *  what the comfort mapping did, and the frame budget, so a headset session reports what the sandbox cannot see.
 *  Frame voice; head-locked (it is an instrument, not the room); refreshed twice a second, uploaded only then. */
import * as pc from 'playcanvas';
import { makeScreenEntity, makeScreenTexture } from '../engine/screenTexture';
import { FRAME } from '../desktop/theme/chrome';
import { fontFor, monoFor, VENDORED, type FaceEra } from '../desktop/theme/fonts';

export interface XrDebugSource {
  lines(): string[];
}

/** ⚑ S373 — THE FONT PROBE (his 12 Nov headset test: 1997's text was a thin typewriter face on the Quest, a heavy mono on
 *  the Mac). One sample line per face stack, drawn in that stack at a real UI size, with its measured width and whether
 *  the vendored family resolved. A photograph of this through the cast says which face the Quest actually draws: the
 *  widths differ by stack (Fixedsys 0.5 em, Courier/Cutive 0.6 em, the sans faces by letter), and the letters show it. */
const PROBE_TEXT = 'Hamburgefonstiv 0123';
interface Probe { label: string; font: string; vendored?: string }
const probes = (): Probe[] => {
  const e = (era: FaceEra): string => fontFor(18, era);
  return [
    { label: '1997/03', font: e('e1'), vendored: VENDORED.bitmap },
    { label: '2016', font: e('e3'), vendored: VENDORED.ui2016 },
    { label: '2026', font: e('e4'), vendored: VENDORED.ui2026 },
    { label: 'sys mono', font: monoFor(18) },
    { label: 'frame', font: '18px "Tahoma", "Verdana", sans-serif' }
  ];
};

/** ⚑ S373 — THE EYE BUFFER, MEASURED (idea 13): what the lenses are fed, per eye, and the pixels per degree that follows.
 *  In a real session the views carry the XR viewport and the projection; in the emulated headset (mono, `app.xr.active`
 *  forced) there are no views, so the canvas and the camera's own field stand in and the line says "emu". */
export function eyeBufferReadout(app: pc.AppBase, head: pc.Entity): string[] {
  const list = (app.xr as unknown as { views?: { list?: Array<{ viewport: pc.Vec4; projMat: pc.Mat4 }> } } | undefined)?.views?.list ?? [];
  let w: number, h: number, hfov: number, vfov: number, n: number, tag: string;
  if (list.length) {
    const v = list[0], m = v.projMat.data;
    w = v.viewport.z; h = v.viewport.w; n = list.length; tag = 'eye';
    hfov = Math.atan((m[8] + 1) / m[0]) - Math.atan((m[8] - 1) / m[0]);
    vfov = Math.atan((m[9] + 1) / m[5]) - Math.atan((m[9] - 1) / m[5]);
  } else {
    const cam = head.camera!, canvas = app.graphicsDevice.canvas as HTMLCanvasElement;
    w = canvas.width; h = canvas.height; n = 1; tag = 'emu';
    vfov = cam.fov * Math.PI / 180; hfov = 2 * Math.atan(Math.tan(vfov / 2) * (w / h));
  }
  const deg = (r: number): number => r * 180 / Math.PI;
  const avg = w / deg(hfov);                                    // the buffer's width over the field's: the average
  const ctr = (w / 2) / Math.tan(hfov / 2) * Math.PI / 180;     // at the centre of a rectilinear view: the highest
  return [`${tag} ${Math.round(w)}x${Math.round(h)} x${n} · fov ${deg(hfov).toFixed(0)}x${deg(vfov).toFixed(0)}`,
    `px/deg ${avg.toFixed(1)} avg · ${ctr.toFixed(1)} centre`];
}

let plateMounted = false;
export function mountXrDebug(app: pc.AppBase, head: pc.Entity, source: XrDebugSource): void {
  plateMounted = true;
  const W = 512, H = 420;
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const tex = makeScreenTexture(app, canvas, true);
  const plate = makeScreenEntity('xr-debug', tex, 0.32, 0.2625, true);
  const layer = new pc.Layer({ name: 'XR debug', clearDepthBuffer: true });
  app.scene.layers.pushTransparent(layer); head.camera!.layers = [...head.camera!.layers, layer.id];
  plate.render!.layers = [layer.id];
  // S271 (the 31 Oct cast: the plate sat over the helper's tooltip and window text) — lower and further left, still readable
  head.addChild(plate); plate.setLocalPosition(-0.27, -0.35, -0.8); plate.setLocalEulerAngles(90, 0, 0);
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
    const all = [...lines.slice(0, 8), ...eyeBufferReadout(app, head)];
    all.forEach((l, i) => ctx.fillText(l.slice(0, 44), 10, 6 + i * 22));
    // the probe: each stack's sample at its real face, its measured width on the right
    let y = 6 + all.length * 22 + 6;
    ctx.fillStyle = FRAME.dim; ctx.fillRect(10, y - 3, W - 20, 1); y += 2;
    for (const p of probes()) {
      ctx.font = p.font; ctx.fillStyle = FRAME.ink;
      ctx.fillText(PROBE_TEXT, 10, y);
      const wpx = ctx.measureText(PROBE_TEXT).width;
      ctx.font = '14px "Courier New", monospace'; ctx.fillStyle = FRAME.dim;
      const ok = p.vendored ? (document.fonts?.check(`18px "${p.vendored}"`) ? ' vend' : ' FALLBACK') : '';
      ctx.fillText(`${p.label} w${wpx.toFixed(0)}${ok}`, 244, y + 3);
      y += 27;
    }
    tex.upload();
  });
}

/** ⚑ S373 / J18-A5 — THE HONEST DRAW COUNT. `app.stats.drawCalls.total` is the graphics device's per-frame counter, and the
 *  engine's forward renderer draws every mesh once PER VIEW in an immersive session (`renderForwardInternal`'s view loop,
 *  PlayCanvas 2.19: `for (v of viewList) device.draw(...)`, each bumping `_drawCallsPerFrame`). So in the Quest the raw
 *  number is two eyes' worth: his 88–102 in 1997 is 44–51 of scene, against the 75 budget (and tools/quest-e4.mjs's
 *  "stereo-blind" 41/75 worst case). The debug plate itself is one more draw per eye, taken off. Desktop and the emulated
 *  headset (mono, no views) have one view and no plate cost to speak of, so raw = per-scene there. */
export function sceneDrawCalls(app: pc.AppBase): { raw: number; views: number; scene: number } {
  const raw = app.stats.drawCalls.total;
  const list = (app.xr as unknown as { views?: { list?: unknown[] } } | undefined)?.views?.list;
  const views = app.xr?.active && list?.length ? list.length : 1;
  const plate = app.xr?.active && plateMounted ? 1 : 0;   // the debug plate, when there is one: one draw per view
  return { raw, views, scene: Math.max(0, Math.round(raw / views) - plate) };
}
