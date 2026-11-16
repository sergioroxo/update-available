/**
 * ⚑ S398 (UiB job 29 A8) — THE TEXT-SIZE CARD, for his Quest session (Fable's review §1.1, steps 0–2: the cheap question
 * first — can the 12 Nov fixes be read at all — before any layer work). `?debug=1&textcard=1` only: a card hangs ONE METRE
 * ahead of the eye, level with it, and on it one line of the monitors' text at four sizes, each labelled with the angle
 * its letters make at that distance: 0.6°, 0.8°, 1.0° and 1.2° (the font's em size, the unit tools/text-angle.mjs and the
 * reading studies use; a capital is about 70 % of it). He reads the smallest line he can, and that is the first real
 * number for the headset's text (the monitors today: about 0.86–1.05° for body text, by calculation only).
 *
 * The line is drawn in the 1997/2003 monitors' own face (Fixedsys Excelsior, bold, as their body text is), into a
 * texture far finer than the headset's eye buffer (about 35 texture pixels for the 0.6° line, against about 12–14 of the
 * Quest's per eye), so the card measures the headset and not the card. No layer work: it is an ordinary plane in the
 * room's world, held still like a monitor (not head-locked), drawn on its own layer over the room so the monitor in front
 * of it never hides it. Placed when it first shows, and placed again if the eye has moved more than 15 cm from where it was
 * placed (the seat's calibration, an era's move). Frame voice: functional, plain, never playing. The sheet for him is
 * docs/TEXT_SIZE_CARD_QUEST_SHEET.md.
 */
import * as pc from 'playcanvas';
import { makeScreenEntity, makeScreenTexture } from '../engine/screenTexture';
import { FRAME } from '../desktop/theme/chrome';
import { FACES, fontsReady } from '../desktop/theme/fonts';
import copy from '../../data/strings/text_card.json';

/** the card's distance from the eye, and its glass (metres) */
const DIST = 1.0, CARD_W = 0.8, CARD_H = 0.24;
/** canvas pixels across the card: 3200 px/m, so the 0.6° line's em is 35 px */
const CW = 2560, CH = Math.round(2560 * CARD_H / CARD_W);
const PX_PER_M = CW / CARD_W;
/** the em, in canvas pixels, of a letter that makes `deg` degrees at DIST */
const emPx = (deg: number): number => 2 * Math.tan((deg * Math.PI / 180) / 2) * DIST * PX_PER_M;
const SIZES = [1.2, 1.0, 0.8, 0.6];
/** the eye may move this far before the card is placed again (m) */
const REPLACE = 0.15;

export function mountTextSizeCard(app: pc.AppBase, head: pc.Entity): void {
  const canvas = document.createElement('canvas'); canvas.width = CW; canvas.height = CH;
  const ctx = canvas.getContext('2d')!;
  const tex = makeScreenTexture(app, canvas, 'screen');
  const pivot = new pc.Entity('xr-text-card');
  const card = makeScreenEntity('xr-text-card-glass', tex, CARD_W, CARD_H, true);   // drawn in the layer's transparent pass; its fill is opaque
  card.setLocalEulerAngles(90, 0, 0);
  pivot.addChild(card);
  app.root.addChild(pivot);
  // its own layer over the room (the monitor stands nearer than a metre), as the debug plate's
  const layer = new pc.Layer({ name: 'XR text card', clearDepthBuffer: true });
  app.scene.layers.pushTransparent(layer);
  head.camera!.layers = [...head.camera!.layers, layer.id];
  card.render!.layers = [layer.id];
  pivot.enabled = false;

  const draw = (): void => {
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = FRAME.edge; ctx.fillRect(0, 0, CW, CH);
    ctx.textBaseline = 'alphabetic';
    // the heading, at 1.4° so it is never the thing being tested
    const head16 = emPx(1.4);
    ctx.font = `${Math.round(head16)}px "Tahoma", "Verdana", sans-serif`; ctx.fillStyle = FRAME.dim;
    let y = Math.round(head16 * 1.15);
    ctx.fillText(copy.heading, 40, y);
    y += Math.round(head16 * 0.5);
    for (const deg of SIZES) {
      const em = emPx(deg);
      y += Math.round(Math.max(em, emPx(1.3)) * 1.25);
      ctx.font = `${Math.round(emPx(1.3))}px "Tahoma", "Verdana", sans-serif`; ctx.fillStyle = FRAME.faint;
      ctx.fillText(copy.label.replace('{deg}', deg.toFixed(1)), 40, y);
      ctx.font = `bold ${Math.round(em * 100) / 100}px ${FACES.e1.family}`; ctx.fillStyle = FRAME.bright;
      ctx.fillText(copy.line, 300, y);
    }
    tex.upload();
  };
  let drawn = false;
  void fontsReady().then(() => { draw(); drawn = true; });

  const placedEye = new pc.Vec3(); let placed = false;
  const place = (): void => {
    const eye = head.getPosition();
    const f = head.forward.clone(); f.y = 0;
    if (f.lengthSq() < 1e-6) f.set(0, 0, -1);
    f.normalize();
    pivot.setPosition(eye.x + f.x * DIST, eye.y, eye.z + f.z * DIST);
    pivot.setEulerAngles(0, Math.atan2(-f.x, -f.z) * 180 / Math.PI, 0);
    placedEye.copy(eye); placed = true;
  };
  app.on('update', () => {
    pivot.enabled = drawn;
    if (!drawn) return;
    if (!placed || head.getPosition().distance(placedEye) > REPLACE) place();
  });
}
