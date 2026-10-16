/** Fullscreen is gesture-bound. The URL carries only a reload request, never visitor data. */
export function isFullscreen(): boolean { return !!document.fullscreenElement; }

/** Best effort inside the visitor's activation stack; unsupported/denied requests stay windowed. */
export function requestFullscreenSoft(): void {
  try {
    if (isFullscreen()) return;
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
    const req = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
    const result = req?.();
    if (result && typeof result.catch === 'function') result.catch(() => { /* play windowed */ });
  } catch { /* play windowed */ }
}

export function markFullscreenForReload(): void {
  if (!isFullscreen()) return;
  const query = new URLSearchParams(window.location.search);
  query.set('fs', '1');
  window.history.replaceState(window.history.state, '', window.location.pathname + '?' + query.toString() + window.location.hash);
}

/** Consume immediately, before waiting for the first wake-screen gesture. */
export function reenterFullscreenIfMarked(): boolean {
  const query = new URLSearchParams(window.location.search);
  const marked = query.get('fs') === '1';
  if (query.has('fs')) {
    query.delete('fs');
    const search = query.toString();
    window.history.replaceState(window.history.state, '', window.location.pathname + (search ? '?' + search : '') + window.location.hash);
  }
  return marked;
}
