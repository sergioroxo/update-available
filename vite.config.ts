import { defineConfig } from 'vite';

export default defineConfig({
  // Static deploy under https://<user>.github.io/update-available/
  base: './',
  server: {
    // `npm run dev -- --host` exposes the server for the Quest loop
    // (tailscale serve provides the HTTPS WebXR needs).
  },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0
  }
});
