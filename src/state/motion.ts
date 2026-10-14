/** One live preference, held only in the session ledger and wiped with it. */
import { ledger } from './ledger';
const device = typeof window === 'undefined' ? null : window.matchMedia('(prefers-reduced-motion: reduce)');
const reviewReduced = typeof location !== 'undefined' && new URLSearchParams(location.search).get('motion') === 'reduced';
export function reducedMotion(): boolean {
  return ledger.view.reduceMotion ?? (reviewReduced || device?.matches === true);
}
export function setReducedMotion(value: boolean): void {
  ledger.view.reduceMotion = value;
  document.documentElement.dataset.reducedMotion = reducedMotion() ? '1' : '0';
}
