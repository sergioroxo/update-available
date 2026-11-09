import { defineConfig } from 'vite';

import { execSync } from 'node:child_process';

/** ⚑ The debug panel's build stamp, derived from git so it can never go stale.
 *  `<short-sha> · <subject, trimmed>` — enough for Sérgio to say, from a photo of
 *  a device, exactly which commit he is looking at. */
/** ⚑ S349 / T12 (his 8 Nov: the Quest ran an old build and nobody could tell) — the commit and the moment of the
 *  build, injected here (no network, no storage): the game menu's About/credits line and the headset's debug plate
 *  show them, so a glance says whether a device loaded today's build. Local time, minutes. */
function buildCommit(): string {
  try { return execSync('git rev-parse --short HEAD').toString().trim(); } catch { return 'dev'; }
}
function buildDate(): string {
  const d = new Date(), p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function buildTag(): string {
  try {
    const sha = execSync('git rev-parse --short HEAD').toString().trim();
    const subject = execSync('git log -1 --pretty=%s').toString().trim().slice(0, 46);
    return `${sha} · ${subject}`;
  } catch {
    return 'dev · no git';
  }
}


/** ⚑ S166 — the version on the front door (Sérgio: "since this is a work-in-progress, add
 *  a V0.X or alpha/beta to the title"): package.json's version, never typed twice. */
import { readFileSync } from 'node:fs';
const PKG_VERSION = (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }).version;

export default defineConfig({
  define: { __FESTIVAL__: process.env.VITE_EDITION === 'festival', __BUILD_TAG__: JSON.stringify(buildTag()), __APP_VERSION__: JSON.stringify(PKG_VERSION),
    __BUILD_COMMIT__: JSON.stringify(buildCommit()), __BUILD_DATE__: JSON.stringify(buildDate()) },
  // Static deploy under https://<user>.github.io/update-available/
  base: './',
  server: {
    // `npm run dev -- --host` exposes the server for the Quest loop
    // (tailscale serve provides the HTTPS WebXR needs).
    // PORT env (set by preview launchers) wins so parallel sessions don't
    // fight over 5174; falls back to vite's default.
    port: process.env.PORT ? Number(process.env.PORT) : undefined
  },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0
  }
});
