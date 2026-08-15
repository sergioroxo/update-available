import { defineConfig } from 'vite';

import { execSync } from 'node:child_process';

/** ⚑ The debug panel's build stamp, derived from git so it can never go stale.
 *  `<short-sha> · <subject, trimmed>` — enough for Sérgio to say, from a photo of
 *  a device, exactly which commit he is looking at. */
function buildTag(): string {
  try {
    const sha = execSync('git rev-parse --short HEAD').toString().trim();
    const subject = execSync('git log -1 --pretty=%s').toString().trim().slice(0, 46);
    return `${sha} · ${subject}`;
  } catch {
    return 'dev · no git';
  }
}


export default defineConfig({
  define: { __BUILD_TAG__: JSON.stringify(buildTag()) },
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
