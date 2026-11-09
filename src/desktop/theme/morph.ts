/**
 * ⚑ S347 — THE ERA CHANGE'S SHINE (UiB job 6, his 9 Nov note on job 5: "the morph that already existed: the one
 * that shines and changes"). The colours the room's fold glows with as it changes, and the glints it throws off.
 * No new colour: the lamp's warm and the gold are TIDY's, the spark is the 1997 calendar's stage-light spark — the
 * warm light is life (the style direction's governing idea), so the room's change is lit with it.
 */
import { TIDY, CAL_1997 } from './calendar';

export const MORPH_SHINE = {
  /** the light that travels with the change, and the glow a changing prop takes */
  warm: TIDY.lamp,
  /** the glints' deeper half */
  gold: TIDY.glow,
  /** the glints' bright half, and the rim on the landing's particles */
  spark: CAL_1997.spark
} as const;
