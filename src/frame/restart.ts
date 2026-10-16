import { wipeLedger } from '../state/ledger';
import { gameMenuBus } from '../state/gameMenuBus';
import { markFullscreenForReload } from './fullscreen';

/** One fresh in-memory visit, from every restart/idle return. */
export function restartVisit({ armed = false }: { armed?: boolean } = {}): void {
  wipeLedger();
  const query = new URLSearchParams(window.location.search);
  for (const key of ['era', 'morph', 'close', 'reveal', 'cut', 'setup']) query.delete(key);
  const home = query.get('entrance') === 'home';
  const hash = home && armed ? '#home-armed' : window.location.hash === '#home-armed' ? '' : window.location.hash;
  const search = query.toString();
  window.history.replaceState(window.history.state, '', window.location.pathname + (search ? '?' + search : '') + hash);
  markFullscreenForReload();
  const session = gameMenuBus.xrSession;
  if (session?.active()) {
    try { session.end(); } catch { /* reload also ends the session */ }
    window.setTimeout(() => window.location.reload(), 600);
    return;
  }
  window.location.reload();
}
