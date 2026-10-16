/** One read-only Start model for all four machines. No navigation or filing here. */
import { mapState } from './map';
import type { DesktopOS } from '../desktop/os';
import type { PanelEra } from '../desktop/apps/startPanel';
import copy from '../../data/strings/slice.json';
import extras from '../../data/strings/extras.json';
import { extraOn, extraPassed, isSpeedrun } from '../state/cut';

export function buildStartModel(os: Partial<DesktopOS> | undefined, era: PanelEra) {
  // The small surfaces supply only the parts they own; beatDone treats missing parts as false.
  const source = Object.create(os ?? null) as DesktopOS;
  Object.defineProperty(source, 'era', { value: era });
  // A machine menu always names its own era, including after a completed Close.
  Object.defineProperty(source, 'mapAtClose', { value: false });
  const state = mapState(source);
  const here = state.eras.find(e => e.id === era)!;
  const index = here.beats.findIndex(b => b.state === 'current');
  const steps = here.beats.map(({ beat, state }) => ({
    id: beat.id, label: beat.label, hint: beat.hint, state, optional: !!beat.optional,
    place: beat.where && !/^(?:the )?(?:monitor|screen|desktop|workstation)(?: on the desk)?$/i.test(beat.where)
      ? `${copy.desktop.startMenu.room}: ${copy.desktop.startMenu.roomPrefix.replace('{where}', beat.where).replace(': {hint}', '')}` : '',
    where: beat.where
  }));
  return {
    now: index < 0 ? null : steps[index],
    next: index < 0 ? [] : steps.slice(index + 1, index + 3),
    steps,
    extras: extras[era].map(e => ({ ...e, on: !isSpeedrun() || extraOn(e.id), passed: extraPassed(e.id) })),
    room: steps.filter(b => b.optional && b.state !== 'done' && b.place),
    jump: state.eras.filter(e => e.id !== 'close').map(e => ({ era: e.id as PanelEra, label: e.label, current: e.id === era }))
  };
}
export type StartModel = ReturnType<typeof buildStartModel>;
