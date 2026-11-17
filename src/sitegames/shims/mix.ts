/**
 * ⚑ S400 — stands in for src/audio/mix.ts in the era websites' game builds (tools/build-site-games.mjs). The piece's
 * mixer (master and channel sliders) is not on the page, so every channel is at its full level; a change of the page's
 * mute reaches the games through `subscribeMix`, exactly as a slider move does in the piece.
 */
import { siteSound } from '../sound';

export type Channel = 'music' | 'room' | 'voices' | 'effects' | 'film';
export function scaleFor(_c: Channel): number { return 1; }
export function subscribeMix(fn: () => void): () => void { return siteSound.subscribe(fn); }
