/**
 * ⚑ S400 — stands in for src/state/motion.ts in the era websites' game builds (tools/build-site-games.mjs). In the
 * piece the preference also lives in the session ledger; on the page there is no ledger, so it is the visitor's own
 * system setting, read live.
 */
const query = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
export function reducedMotion(): boolean { return query?.matches === true; }
export function setReducedMotion(_value: boolean): void { /* the page has no setting of its own */ }
