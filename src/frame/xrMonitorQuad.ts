/** Opt-in 1997 monitor compositor experiment. Retains the MSAA room layer.
 * Canvas uploads are versioned; opaque compositor textures are rendered to,
 * never passed to tex(Sub)Image2D. WebGL state is restored before PlayCanvas resumes. */
import * as pc from 'playcanvas';
import { runtimeQuery } from '../edition';

export type RoomSession = XRSession & { __yufRoomLayer?: XRWebGLLayer };
export const quadRequested = (): boolean => runtimeQuery().get('quad') === '1';
export const quadSessionOptions = (): { optionalFeatures?: string[] } => quadRequested() ? { optionalFeatures: ['layers'] } : {};

export function mountXrMonitorQuad(app: pc.Application, screen: pc.Entity, canvas: HTMLCanvasElement,
  era: () => string, physicalPoint: (p: pc.Vec3) => pc.Vec3) {
  let room: XRWebGLLayer | null = null, session: RoomSession | null = null;
  let binding: XRWebGLBinding | null = null, quad: XRQuadLayer | null = null;
  let frame: XRFrame | null = null, version = 0, sent = -1, width = 0, height = 0;
  let texture: WebGLTexture | null = null, read: WebGLFramebuffer | null = null, draw: WebGLFramebuffer | null = null;
  let active = false, failed = false, uploads = 0, copies = 0;
  const xr = app.xr;
  const gl = (app.graphicsDevice as pc.WebglGraphicsDevice).gl as WebGL2RenderingContext;
  const restorePlane = () => { if (screen.render) screen.render.enabled = true; active = false; };
  const releaseQuad = () => { quad?.destroy(); quad = null; width = height = 0; sent = -1; };
  const stop = (ending = false) => {
    restorePlane();
    if (session) {
      if (!ending && room) session.updateRenderState({ baseLayer: room });
      delete session.__yufRoomLayer;
    }
    releaseQuad();
    if (texture) gl.deleteTexture(texture);
    if (read) gl.deleteFramebuffer(read);
    if (draw) gl.deleteFramebuffer(draw);
    texture = read = draw = null; binding = null; session = null; room = null; frame = null;
  };
  xr?.on('start', () => { failed = false; uploads = copies = 0; });
  xr?.on('end', () => stop(true));
  xr?.on('update', (f: XRFrame) => { frame = f; });
  app.on('postrender', () => {
    if (!quadRequested() || failed || !xr?.active || !frame) return;
    const s = xr.session as RoomSession;
    if (era() !== 'e1' || !screen.enabled) { if (session) stop(); return; }
    try {
      if (!session) {
        if (typeof XRWebGLBinding === 'undefined' || !gl.blitFramebuffer) return;
        room = s.renderState.baseLayer ?? null;
        if (!room) return;
        session = s;
        binding = new XRWebGLBinding(s, gl);
        texture = gl.createTexture(); read = gl.createFramebuffer(); draw = gl.createFramebuffer();
      }
      if (!quad || width !== canvas.width || height !== canvas.height) {
        releaseQuad(); width = canvas.width; height = canvas.height;
        quad = binding!.createQuadLayer({ space: xr._referenceSpace!, width: 0.4, height: 0.3,
          viewPixelWidth: width, viewPixelHeight: height, textureType: 'texture', layout: 'mono', isStatic: true });
        session.__yufRoomLayer = room!;
        session.updateRenderState({ layers: [room!, quad] });
      }
      // Comfort restores the logical world in postrender. Map three basis points
      // explicitly, so Recentre, table matching and system sends reach the quad too.
      const centre = screen.getPosition().clone();
      const p = physicalPoint(centre), right = physicalPoint(centre.clone().add(pc.Vec3.RIGHT)).sub(p).normalize();
      const up = physicalPoint(centre.clone().add(pc.Vec3.UP)).sub(p).normalize();
      const normal = new pc.Vec3().cross(right, up);
      const m = new pc.Mat4(); m.set([right.x,right.y,right.z,0, up.x,up.y,up.z,0, normal.x,normal.y,normal.z,0, 0,0,0,1]);
      const q = new pc.Quat().setFromMat4(m);
      quad.transform = new XRRigidTransform({ x:p.x, y:p.y, z:p.z }, { x:q.x,y:q.y,z:q.z,w:q.w });
      const changed = sent !== version;
      if (changed || quad.needsRedraw || !active) {
        const oldRead = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING), oldDraw = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING);
        const oldTex = gl.getParameter(gl.TEXTURE_BINDING_2D), flip = gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);
        const scissor = gl.isEnabled(gl.SCISSOR_TEST);
        try {
          gl.bindTexture(gl.TEXTURE_2D, texture);
          if (sent < 0) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
          }
          if (changed) {
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, canvas); uploads++; sent = version;
          }
          const sub = binding!.getSubImage(quad, frame);
          gl.bindFramebuffer(gl.READ_FRAMEBUFFER, read);
          gl.framebufferTexture2D(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
          gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, draw);
          gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sub.colorTexture, 0);
          gl.disable(gl.SCISSOR_TEST);
          const v = sub.viewport;
          gl.blitFramebuffer(0,0,width,height,v.x,v.y,v.x+v.width,v.y+v.height,gl.COLOR_BUFFER_BIT,gl.LINEAR); copies++;
        } finally {
          gl.bindFramebuffer(gl.READ_FRAMEBUFFER, oldRead); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, oldDraw);
          gl.bindTexture(gl.TEXTURE_2D, oldTex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flip);
          if (scissor) gl.enable(gl.SCISSOR_TEST);
        }
      }
      if (screen.render) screen.render.enabled = false;
      active = true;
    } catch (error) { console.warn('Monitor quad unavailable; retaining monitor plane.', error); stop(); failed = true; }
  });
  return { changed: () => { version++; }, status: () => ({ active, uploads, copies, width, height, failed }) };
}
