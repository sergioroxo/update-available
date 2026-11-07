/** Missing WebXR or a denied iframe policy must never block the browser room. */
export function xrAccessAllowed(): boolean {
  if (!navigator.xr) return false;
  const policy = (document as Document & {
    permissionsPolicy?: { allowsFeature(name: string): boolean };
    featurePolicy?: { allowsFeature(name: string): boolean };
  }).permissionsPolicy ?? (document as Document & {
    featurePolicy?: { allowsFeature(name: string): boolean };
  }).featurePolicy;
  try { return policy?.allowsFeature('xr-spatial-tracking') ?? true; }
  catch { return false; }
}
