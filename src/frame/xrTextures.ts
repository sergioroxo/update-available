/** ⚑ S270e — THE ROOM'S PICTURES IN A HEADSET. His Quest 3, 31 Oct: "a lot of the triangulations on the edges,
 *  especially on the rackets and the posters. It's very difficult to read." The room's textures are pixel art,
 *  sampled FILTER_NEAREST with no mip chain (the pixel law), which is right on a flat screen at a fixed distance and
 *  wrong in a headset, where every poster is minified and slanted and the head never stops moving: texels drop in
 *  and out (shimmer, moiré, broken lines). For the session only, every room texture gains a mip chain, trilinear
 *  minification and anisotropy; magnification stays NEAREST, so a pixel seen close is still a hard pixel. The
 *  screens (engine/screenTexture.ts) already do this for themselves and are left alone. Restored on exit. */
import * as pc from 'playcanvas';

type Saved = { mipmaps: boolean; minFilter: number; anisotropy: number };

export function mountXrTextures(app: pc.AppBase): void {
  const saved = new Map<pc.Texture, Saved>();
  let wait = 0;
  const sweep = (): void => {
    const aniso = Math.min(8, app.graphicsDevice.maxAnisotropy);
    for (const layer of app.scene.layers.layerList) for (const mi of layer.meshInstances) {
      const m = mi.material as pc.StandardMaterial | null;
      if (!m) continue;
      for (const t of [m.diffuseMap, m.emissiveMap, m.opacityMap]) {
        if (!t || saved.has(t) || (t as unknown as { __screen?: boolean }).__screen || t.minFilter !== pc.FILTER_NEAREST) continue;
        // a non-power-of-two texture only gets its chain on a full re-send (the engine skips a mip-only pass for it,
        //   and a trilinear sampler on a texture without mips draws black) — so it needs its source still in hand
        const source = t.getSource();
        if (!t.pot && !source) continue;
        saved.set(t, { mipmaps: t.mipmaps, minFilter: t.minFilter, anisotropy: t.anisotropy });
        t.mipmaps = true; t.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR; t.anisotropy = aniso;
        if (!t.pot) t.upload();
      }
    }
  };
  // new textures arrive with the story (an era's props, a calendar page): look again every two seconds
  app.on('update', (dt: number) => {
    if (!app.xr?.active || (wait -= dt) > 0) return;
    wait = 2; sweep();
  });
  app.xr?.on('end', () => {
    for (const [t, s] of saved) { t.mipmaps = s.mipmaps; t.minFilter = s.minFilter; t.anisotropy = s.anisotropy; }
    saved.clear(); wait = 0;
  });
}
