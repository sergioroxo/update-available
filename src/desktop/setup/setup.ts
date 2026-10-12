/** E1 hand-off only. E2 replaces this file with the monitor's setup. Memory only. */
export async function startSetup(): Promise<{ cut: 'full' | 'speedrun' }> {
  return { cut: new URLSearchParams(window.location.search).get('cut') === 'speedrun' ? 'speedrun' : 'full' };
}
