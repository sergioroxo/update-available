/**
 * XR MOCK — the emulated headset, shared (S375, UiB job 19 Part A).
 *
 * What tools/xr-tour.mjs does inline, lifted so the TOURS can also be photographed through it: the page's `app.xr.active`
 * reads true, the head (the child camera) sits at a tracked 1.2 m above the rig, the field of view is a headset's
 * (75° vertical), the debug plate is hidden, and `window.__camFree(x, y, z, pitch, yaw)` is REPLACED by a head turn —
 * in a headset the rig holds the authored pose and only the head moves, so a tour's "free camera" calls become
 * "look this way from the seat": yaw is taken relative to the era's seat bearing, the position is ignored.
 *
 * Mono WebGL; no claim of headset timing or stereo. A review route; never a reachability proof.
 */
const SEAT_YAW = { 1: 0, 2: 0, 3: 93, 4: 270 };

/** call once the page has `__os`, `__app` and `__xrComfort`; `era` is 1..4 */
export async function installXrMock(page, era, { hires = true } = {}) {
  await page.waitForFunction(() => window.__os && window.__app && window.__xrComfort, { timeout: 180000 });
  await page.evaluate((seatYaw, hide) => {
    const app = window.__app, head = app.root.findByName('camera');
    Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
    head.setLocalPosition(0, 1.2, 0);
    head.camera.fov = 75;
    if (hide) app.root.findByName('xr-debug')?.setLocalScale(0, 0, 0);
    window.__xrMock = { seatYaw };
    window.__camFreeReal = window.__camFree;
    window.__headNow = { pitch: 0, yaw: 0 };
    window.__camFree = (x, y, z, pitch, yaw) => {
      let rel = yaw - seatYaw;
      while (rel > 180) rel -= 360;
      while (rel <= -180) rel += 360;
      window.__headNow = { pitch, yaw: rel };
      head.setLocalEulerAngles(pitch, rel, 0);
    };
  }, SEAT_YAW[era] ?? 0, hires);
  await page.waitForFunction(() => window.__xrComfort.calibrated && !window.__xrComfort.busy, { timeout: 20000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2500));
}
