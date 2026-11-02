/** ⚑ S291 — review harness for the site viewer WITHOUT the 3D engine: mounts the DOM window alone, so its drawing can be
 *  photographed fast (tools/site-viewer-review.mjs --harness). Not part of the build; Vite serves it in dev. */
import { mountSiteViewerDom, siteViewerBus } from '../../src/frame/siteViewer';

const core = mountSiteViewerDom();
(window as unknown as { __sv: unknown }).__sv = { core, open: (t: string) => siteViewerBus.open(t as 'hub') };
