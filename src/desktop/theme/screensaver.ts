/** Room colours reused by the pixel maze. Flat walls are papered as pixel bands;
 * no borrowed wallpaper or texture assets. Daniel's rug and door are literally his room's colours. */
import room from '../../../data/room/era1.json';
const colour = (id: string): string => room.props.find(p => p.id === id)!.color;
export const SAVER_ROOM = {
  wall: colour('wallNorth'), wallSide: colour('wallWest'),
  carpet: colour('rug'), carpetLow: colour('doorKnob'),
  door: colour('door'), knob: colour('moon'), night: colour('windowPane')
};
