/**
 * ⚑ S349 / T12 — WHICH BUILD IS THIS? The short git commit and the build's date and time, injected by Vite at build
 * time (vite.config.ts `define`; no network, nothing stored). Shown on the game menu's About and Credits views and on
 * the headset's debug plate, so Sérgio can tell at a glance whether the Quest loaded today's build (on 8 Nov it ran
 * an old one). The dev server stamps the moment it started.
 */
declare const __BUILD_COMMIT__: string;
declare const __BUILD_DATE__: string;

export const BUILD_COMMIT: string = typeof __BUILD_COMMIT__ === 'string' ? __BUILD_COMMIT__ : 'dev';
export const BUILD_DATE: string = typeof __BUILD_DATE__ === 'string' ? __BUILD_DATE__ : '';
/** "a1b2c3d · 2026-11-09 21:30" */
export const BUILD_STAMP: string = BUILD_DATE ? `${BUILD_COMMIT} · ${BUILD_DATE}` : BUILD_COMMIT;
