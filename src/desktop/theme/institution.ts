/**
 * ⚑ S183 — THE INSTITUTION'S LIGHTS (src/room/institution.ts). The corner around the
 * record lights when the file grows: the intake terminal's phosphor, the scanner's
 * passing lamp, the router's link light, 2026's status light. The last two are the
 * colours their props already carry in data/room/reinterp_deltas.json.
 */
export const INSTITUTION = {
  terminalGlow: '#3AE07A',
  scannerGlow: '#EEF6FF',
  routerGlow: '#3AE07A',
  statusGlow: '#3A9AFF'
} as const;
