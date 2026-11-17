/** Branch IDs also connect the read-only map and help panels to the active route. */
export function extraForBeat(era: string, beat: string): string | undefined {
  const groups: Record<string, Record<string, string>> = {
    e1: { racket: 'room', handheld: 'room', rootcause: 'room' },
    e2: { tapes: 'tapes', cut: 'tapes', forum: 'forum', apply: 'application', clear: 'clear' },
    // ⚑ S403 (job 30 B1) — `family` is on the default visit again ("Answer the mothers"); only the group stays behind `jobs`
    e3: { work: 'work', jobs: 'jobs', recommend: 'jobs', group: 'jobs' },
    e4: { matchmade: 'console' }
  };
  return groups[era]?.[beat];
}
