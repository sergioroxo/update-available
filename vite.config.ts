import { defineConfig } from 'vite';

export default defineConfig({
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
