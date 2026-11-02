/** Compile-time audience edition. Normal builds retain every existing URL switch. */
declare const __FESTIVAL__: boolean;
export const festivalEdition = __FESTIVAL__;

/** Review URLs cannot change the public festival entrance or enable diagnostics. */
export function runtimeQuery(): URLSearchParams {
  return new URLSearchParams(festivalEdition ? '' : window.location.search);
}
