/**
 * ⚑ S415 (UiB job 33 Part D; draft 3 §3 "the stream's light fills it … At the shutdown, that light goes out"; beats 11–12) —
 * THE STREAM'S LIGHT IN HER ROOM. When transjesus.str fills her monitor, its light fills the room: the screen's own light in
 * Maya's room (`light-mayaGlow`, the one light with a source in her room once the lamp has faded, cluster.ts E4_DUSK) takes the
 * stream's colour and grows, and the room's ambient warms a little — the colour changing with the stream's shots, never
 * flashing. At the shutdown the act steps it down in bands, no more than three changes a second, and then it is out: her room
 * keeps its things, and the light goes (the screen dark too, `screen` 0).
 *
 * One hook, like studioLight.ts: the act asks (src/desktop/apps/e4ActFour.ts), the cluster applies it (cluster.ts). A light's
 * colour and intensity and the scene's ambient are uniforms: no recompile, no upload, no draw call.
 */
export interface StreamLight {
  /** 0 … 1: how much of the room is the stream's light (the cluster eases toward it, or snaps when `snap`) */
  level: number;
  /** the stream's colour now (a theme hex) */
  color: string;
  /** 0 … 1: the screen's own light under it (1 = as the room's rig and dusk say; 0 = the monitor is dark) */
  screen: number;
  /** apply at once, not eased (the shutdown's bands: each step is a step) */
  snap?: boolean;
}
let want: StreamLight | null = null;
let version = 0;
/** the act asks for the stream's light (or, null, gives the room back to its rig) */
export function setStreamLight(s: StreamLight | null): void { want = s; version++; }
/** what the act has asked for now */
export function streamLightWant(): StreamLight | null { return want; }
/** bumps on every ask (the cluster re-applies only then, and while it eases) */
export function streamLightVersion(): number { return version; }
