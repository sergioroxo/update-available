/**
 * ⚑ S414 (UiB job 33 Part C; T97·26-21, his "if it took over, like the space should change color and size") — THE STUDIO'S
 * PALE LIGHT. When Shepherd Live™'s session begins (either door), her room recedes into the studio's cold pale light: a linear
 * fog in the studio's own colour comes in from the walls toward the desk, so the room's edges go first and the space reads
 * larger and paler, while the screens in front of her (the monitor, the glass at her eyes) stay sharp. When her friends remove
 * Second Thoughts, the light drains and her room comes back.
 *
 * One hook, like cluster.ts's `setE4Dusk`: the act asks (src/desktop/apps/e4ActThree.ts), the engine eases it and applies it
 * (app.ts). Nothing behind her matters and nothing turns her: it is the whole space, all at once, in every direction.
 *
 * ⚑ The fog is COMPILED IN AT LOAD (app.ts parks it 10 km away): switching a scene's fog on recompiles every lit material on
 * the next frame — measured 614 ms in the headless build — and that hitch must never land in the middle of a beat.
 */
import { PLACE } from '../desktop/theme/era4';

/** the studio's pale: the colour the room recedes into (the session's own sky, src/desktop/apps/shepherd.ts STUDIO.sky) */
export const STUDIO_LIGHT_COLOR: string = PLACE.sky;
let want = 0;
/** the session asks for the studio's light (true) or gives her room back (false) */
export function setStudioLight(on: boolean): void { want = on ? 1 : 0; }
/** what the act has asked for: 0 her room, 1 the studio */
export function studioLightWant(): number { return want; }
