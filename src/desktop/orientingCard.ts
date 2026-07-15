/**
 * R28-3 (minimal version) — THE ORIENTING CARD (docs/
 * REINTERP_RESTRUCTURE_R28_2026-07-10.md §4 layer 1; CLAUDE.md REINTERP
 * AMENDMENTS).
 *
 * Shown ONCE, before O1, on a fresh reinterp load — a single plain,
 * non-diegetic, pre-fiction card: the premise line, a content note ("you
 * can leave at any time; nothing you do is kept"), one controls line, and a
 * single Continue (armed after the same 4s law as O1's own Continue,
 * src/desktop/opening.ts's ARM_DELAY_MS — reused here deliberately).
 *
 * It does NOT replace O1's own disclaimer (unchanged this session, per the
 * brief) — there is deliberate temporary content-note overlap, flagged in
 * 01_SESSION_LOG.md Session 36, resolving once the O1 revamp
 * (docs/reinterp/CODEX_BRIEF_O1_REVAMP_2026-07-12.md) lands.
 *
 * Frame voice: plain type, no cork, no fiction, no decoration. Mounted (see
 * src/main.ts) alongside the game menu, before either engine starts, so
 * Esc/the pause glyph already work while this card is showing.
 */
import copy from '../../data/strings/orientingCard.json';

const ARM_DELAY_MS = 4000; // same law as O1's Continue (opening.ts)

export interface OrientingCard {
  destroy(): void;
}

export function mountOrientingCard(onContinue: () => void): OrientingCard {
  let armed = false;
  let destroyed = false;

  const root = document.createElement('div');
  root.id = 'reinterp-orienting-card';
  Object.assign(root.style, {
    position: 'fixed', inset: '0', zIndex: '900', // below the game menu (1000) — Esc still shows on top
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#08080a',
    font: '14px "Courier New", monospace', color: '#dfe3ea'
  } as CSSStyleDeclaration);

  const card = document.createElement('div');
  Object.assign(card.style, {
    width: 'min(520px, 90vw)', boxSizing: 'border-box', padding: '30px 34px',
    background: '#101014', border: '1px solid #383840', borderRadius: '2px'
  } as CSSStyleDeclaration);
  root.appendChild(card);

  const premise = document.createElement('div');
  Object.assign(premise.style, {
    fontSize: '16px', lineHeight: '1.5', marginBottom: '18px', color: '#f2f4f8'
  } as CSSStyleDeclaration);
  premise.textContent = copy.premise;
  card.appendChild(premise);

  const note = document.createElement('div');
  Object.assign(note.style, {
    fontSize: '12.5px', lineHeight: '1.6', color: '#b7bcc6', marginBottom: '14px'
  } as CSSStyleDeclaration);
  note.textContent = copy.contentNote;
  card.appendChild(note);

  const controls = document.createElement('div');
  Object.assign(controls.style, {
    fontSize: '12px', lineHeight: '1.5', color: '#9aa0ac', marginBottom: '22px'
  } as CSSStyleDeclaration);
  controls.textContent = copy.controlsLine;
  card.appendChild(controls);

  const actions = document.createElement('div');
  Object.assign(actions.style, { display: 'flex', alignItems: 'center', gap: '10px' } as CSSStyleDeclaration);

  const cont = document.createElement('button');
  cont.textContent = copy.continueLabel;
  Object.assign(cont.style, {
    font: 'inherit', fontWeight: '700', fontSize: '13px', padding: '10px 26px',
    border: '1px solid #4a4a54', borderRadius: '2px', cursor: 'not-allowed',
    background: '#26262e', color: '#6f7480', letterSpacing: '1px'
  } as CSSStyleDeclaration);

  const wait = document.createElement('span');
  Object.assign(wait.style, { fontSize: '11px', color: '#6f7480' } as CSSStyleDeclaration);
  wait.textContent = `(${copy.wait})`;

  actions.appendChild(cont);
  actions.appendChild(wait);
  card.appendChild(actions);

  const arm = (): void => {
    if (destroyed) return;
    armed = true;
    cont.style.cursor = 'pointer';
    cont.style.background = '#e8dcc0';
    cont.style.color = '#141414';
    wait.style.display = 'none';
  };
  const armTimer = window.setTimeout(arm, ARM_DELAY_MS);

  cont.addEventListener('click', () => {
    if (!armed || destroyed) return;
    onContinue();
  });

  document.body.appendChild(root);

  return {
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      window.clearTimeout(armTimer);
      root.remove();
    }
  };
}
