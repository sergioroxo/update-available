/**
 * ⚑ S291 — THE SITE VIEWER: the four era websites (public/sites/) inside the piece, in the browser and in the headset.
 * docs/reinterp/SITE_VIEWER_2026-11-01.md. Open it through `siteViewerBus.open('hub' | '1997' | '2003' | '2016' | '2026')`.
 */
export { siteViewerBus, ERA_TARGET, type ViewerTarget } from './bus';
export { mountSiteViewerDom } from './domMount';
export { mountSiteViewerXr, type XrViewer } from './xrMount';
