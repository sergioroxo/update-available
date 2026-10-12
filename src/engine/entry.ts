/** Small entry bridge: engine code loads behind Home, never ahead of its art.
 * Keep cached synchronous calls for WebXR's original button gesture. */
import type { AppShell } from './app';
type Engine = typeof import('./app');
let engine: Engine | null = null;
let loading: Promise<Engine> | null = null;
export function loadEngine(): Promise<Engine> {
  return loading ??= import('./app').then((module) => (engine = module));
}
export function readyEngine(): Engine | null { return engine; }
export async function prepareImmersiveVrEntry(canvas: HTMLCanvasElement): Promise<boolean> {
  return (await loadEngine()).prepareImmersiveVrEntry(canvas);
}
export function requestImmersiveVrEntry(): void { engine?.requestImmersiveVrEntry(); }
export function preparedHomeShell(): AppShell | null { return engine?.preparedHomeShell() ?? null; }
export function enterImmersiveHome(): void { engine?.enterImmersiveHome(); }

/** Wait for Home's first art and two paint opportunities before room preparation.
 * No story tick, ledger write or storage; only local code/models are loaded. */
export function warmRoomBehindHome(canvas: HTMLCanvasElement): () => void {
  let cancelled = false;
  const home = document.getElementById('lambyos-home');
  if (!home) return () => {};
  const images = [...home.querySelectorAll('img')];
  void Promise.all(images.map((img) => img.complete ? Promise.resolve() : new Promise<void>((resolve) => {
    img.addEventListener('load', () => resolve(), { once: true });
    img.addEventListener('error', () => resolve(), { once: true });
  }))).then(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (cancelled || !home.isConnected) return;
      void loadEngine().then((module) => {
        if (!cancelled && home.isConnected) return module.prepareRoomAssets(canvas);
      }).catch((error) => console.error('Room asset preparation failed.', error));
    }));
  });
  return () => { cancelled = true; };
}
