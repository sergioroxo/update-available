/**
 * ⚑ S400 — stands in for src/state/gameMenuBus.ts when a game is built for its era website (tools/build-site-games.mjs
 * aliases the real module to this one). The games read only `soundMuted` from the bus; on the page it is the page's
 * own mute (../sound.ts). The piece's game menu does not exist there.
 */
import { siteSound } from '../sound';

export const gameMenuBus = {
  isOpen: false,
  soundMuted: (): boolean => siteSound.muted()
};
