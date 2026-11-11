/**
 * ⚑ S362 / H38 (his headset, 10 Nov 20:48: "The 'Next task' window is confusing next to the information sent by Lamby")
 * — ONE SOURCE OF TRUTH for what a send (the system's summons: "Next task", "Referral"…) says. Its words live in
 * data/sends.json (`offer.lines`); the task's window draws them, the corner toast that announces the icon says them,
 * and Lamby's balloon says them (data/strings/lambyGuide.json uses `{send}` and `{icon}`, filled here) — the same
 * sentence on every surface, whichever one he meets first. Nothing here is a second copy of the text.
 */
import sendsData from '../../data/sends.json';

interface Def { id: string; offer: { icon: string; lines: string[] } }
const DEFS = (sendsData as unknown as { sends: Def[] }).sends;

/** the offer's lines as running text: paragraphs (split at the blank lines) joined with one space */
export function sendSummary(id: string | undefined): string {
  const def = DEFS.find((s) => s.id === id);
  if (!def) return '';
  const paras: string[] = [];
  let cur: string[] = [];
  for (const ln of def.offer.lines) {
    if (ln === '') { if (cur.length) paras.push(cur.join(' ')); cur = []; } else cur.push(ln);
  }
  if (cur.length) paras.push(cur.join(' '));
  return paras.join(' ');
}

/** the icon's name on the desktop ("Next task", "Referral") */
export function sendIcon(id: string | undefined): string {
  return DEFS.find((s) => s.id === id)?.offer.icon ?? '';
}

/** fill `{send}` and `{icon}` in a guide line; text without them is returned untouched */
export function fillSendText(text: string, id: string | undefined): string {
  if (!text.includes('{')) return text;
  return text.replace('{send}', sendSummary(id)).replace('{icon}', sendIcon(id));
}
